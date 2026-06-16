<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Package;
use App\Models\PortalOrder;
use App\Models\Router;
use App\Models\Transaction;
use App\Services\MikrotikService;
use App\Services\PesapalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Public captive-portal endpoints (no auth). A hotspot client lands here after
 * the router redirects them, picks a package, pays via PesaPal, and is then
 * auto-logged-in with a one-time hotspot credential shaped by the package.
 */
class PortalController extends Controller
{
    public function __construct(private PesapalService $pesapal) {}

    /**
     * Public: packages + branding for a router's captive portal.
     */
    public function packages(Router $router): JsonResponse
    {
        $packages = Package::where('tenant_id', $router->tenant_id)
            ->where('type', 'hotspot')
            ->where('is_active', true)
            ->orderBy('price')
            ->get(['id', 'name', 'description', 'price', 'currency', 'speed_up', 'speed_down', 'data_limit_mb', 'duration_days', 'duration_hours', 'duration_minutes'])
            ->map(fn ($p) => array_merge($p->toArray(), [
                'speed_label' => $p->speed_label,
                'duration_label' => $p->duration_label,
            ]));

        return response()->json([
            'router' => ['id' => $router->id, 'name' => $router->name],
            'organization' => $router->tenant?->name,
            'currency' => $router->tenant?->currency ?? config('hotbill.pesapal.currency'),
            'packages' => $packages,
        ]);
    }

    /**
     * Returns the MikroTik hotspot login.html that redirects clients to this
     * portal. The router fetches this once (via /tool fetch) into its hotspot
     * directory; MikroTik substitutes the $(...) variables at serve time.
     */
    public function loginTemplate(Router $router)
    {
        $portal = config('hotbill.portal_url') . '/portal/' . $router->id;

        // $(...) are MikroTik hotspot template variables — must stay literal.
        $html = <<<HTML
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Connecting…</title>
<meta http-equiv="refresh" content="0; url={$portal}?mac=\$(mac)&ip=\$(ip)&link-login-only=\$(link-login-only)&link-orig=\$(link-orig-esc)&error=\$(error)">
</head>
<body style="font-family:sans-serif;text-align:center;padding-top:40px">
Redirecting to the WiFi portal…
<script>location.href="{$portal}?mac=\$(mac)&ip=\$(ip)&link-login-only=\$(link-login-only)&link-orig=\$(link-orig-esc)&error=\$(error)";</script>
</body>
</html>
HTML;

        return response($html, 200)->header('Content-Type', 'text/html');
    }

    /**
     * Public: create an order and hand back the PesaPal hosted redirect URL.
     */
    public function pay(Request $request): JsonResponse
    {
        $data = $request->validate([
            'router_id' => 'required|exists:routers,id',
            'package_id' => 'required|exists:packages,id',
            'phone' => 'required|string|max:20',
            'provider' => 'nullable|in:mtn,airtel',
            'email' => 'nullable|email',
            'mac' => 'nullable|string|max:32',
            'ip' => 'nullable|string|max:45',
            'link_login' => 'nullable|string',
        ]);

        if (!$this->pesapal->isConfigured()) {
            return response()->json(['message' => 'Payments are not configured for this portal yet.'], 503);
        }

        $router = Router::findOrFail($data['router_id']);
        $package = Package::where('id', $data['package_id'])
            ->where('tenant_id', $router->tenant_id)
            ->where('is_active', true)
            ->firstOrFail();

        $order = PortalOrder::create([
            'tenant_id' => $router->tenant_id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'phone' => $data['phone'],
            'provider' => $data['provider'] ?? null,
            'email' => $data['email'] ?? null,
            'amount' => $package->price,
            'currency' => $package->currency ?? config('hotbill.pesapal.currency'),
            'status' => 'pending',
            'merchant_reference' => 'HB-' . strtoupper(Str::random(18)),
            'client_mac' => $data['mac'] ?? null,
            'client_ip' => $data['ip'] ?? null,
            'link_login' => $data['link_login'] ?? null,
        ]);

        try {
            $ipnId = $this->pesapal->ipnId(rtrim(config('app.url'), '/') . '/api/v1/portal/ipn');

            $result = $this->pesapal->submitOrder([
                'id' => $order->merchant_reference,
                'currency' => $order->currency,
                'amount' => (float) $order->amount,
                'description' => Str::limit($package->name . ' @ ' . $router->name, 90),
                'callback_url' => config('hotbill.portal_url') . '/portal/' . $router->id . '?ref=' . $order->merchant_reference,
                'notification_id' => $ipnId,
                'billing_address' => [
                    'phone_number' => $order->phone,
                    'email_address' => $order->email,
                    'country_code' => 'UG',
                    'first_name' => 'Hotspot',
                    'last_name' => 'User',
                ],
            ]);
        } catch (\Throwable $e) {
            $order->update(['status' => 'failed']);
            Log::error('Portal payment init failed', ['order' => $order->id, 'error' => $e->getMessage()]);
            return response()->json(['message' => 'Could not start payment. Please try again.'], 502);
        }

        $order->update(['pesapal_tracking_id' => $result['order_tracking_id']]);

        return response()->json([
            'reference' => $order->merchant_reference,
            'redirect_url' => $result['redirect_url'],
        ]);
    }

    /**
     * PesaPal IPN callback (GET). Verifies status and fulfills the order.
     */
    public function ipn(Request $request): JsonResponse
    {
        $trackingId = $request->query('OrderTrackingId');
        $reference = $request->query('OrderMerchantReference');

        $order = PortalOrder::when($trackingId, fn ($q) => $q->where('pesapal_tracking_id', $trackingId))
            ->when(!$trackingId && $reference, fn ($q) => $q->where('merchant_reference', $reference))
            ->first();

        if ($order) {
            try {
                $this->reconcile($order);
            } catch (\Throwable $e) {
                Log::error('Portal IPN reconcile failed', ['order' => $order->id, 'error' => $e->getMessage()]);
            }
        }

        // Acknowledgement shape PesaPal expects.
        return response()->json([
            'orderNotificationType' => $request->query('OrderNotificationType', 'IPNCHANGE'),
            'orderTrackingId' => $trackingId,
            'orderMerchantReference' => $reference,
            'status' => 200,
        ]);
    }

    /**
     * Public: portal polls this by merchant_reference. Re-checks PesaPal if still
     * pending (covers delayed IPN), and returns credentials once paid.
     */
    public function status(string $reference): JsonResponse
    {
        $order = PortalOrder::where('merchant_reference', $reference)->firstOrFail();

        if ($order->status === 'pending' && $order->pesapal_tracking_id) {
            try {
                $this->reconcile($order);
            } catch (\Throwable $e) {
                Log::warning('Portal status reconcile failed', ['order' => $order->id, 'error' => $e->getMessage()]);
            }
        }

        return response()->json([
            'status' => $order->status,
            'package' => $order->package?->name,
            'username' => $order->status === 'paid' ? $order->hotspot_username : null,
            'password' => $order->status === 'paid' ? $order->hotspot_password : null,
            'link_login' => $order->status === 'paid' ? $order->link_login : null,
        ]);
    }

    /**
     * Check PesaPal status and, if completed, provision the hotspot session.
     * Idempotent — a no-op once the order is already paid.
     */
    private function reconcile(PortalOrder $order): void
    {
        if ($order->status === 'paid') return;

        $status = $this->pesapal->transactionStatus($order->pesapal_tracking_id);
        $desc = strtolower($status['payment_status_description'] ?? '');

        if ($desc === 'completed') {
            $this->fulfill($order, $status);
        } elseif (in_array($desc, ['failed', 'invalid', 'reversed'])) {
            $order->update(['status' => 'failed']);
        }
        // 'pending' → leave as-is, portal keeps polling
    }

    /**
     * Create the one-time hotspot user on the router and mark the order paid.
     */
    private function fulfill(PortalOrder $order, array $status): void
    {
        $package = $order->package;
        $router = $order->router;

        $username = preg_replace('/\D/', '', $order->phone) ?: ('u' . $order->id);
        $password = strtoupper(Str::random(6));

        $mikrotik = MikrotikService::connect_to($router);
        $mikrotik->createHotspotSession(
            $username,
            $password,
            $package->mikrotik_rate_limit,
            $package->mikrotik_limit_uptime ?: null,
            $package->data_limit_bytes,
        );
        $mikrotik->disconnect();

        // Fee split: PesaPal gateway fee + HotBill platform commission; operator keeps the rest.
        $gross = (float) $order->amount;
        $gatewayFee = round($gross * (float) config('hotbill.pesapal.fee_percent') / 100, 2);
        $platformFee = round($gross * (float) config('hotbill.platform.commission_percent') / 100, 2);
        $operatorNet = round($gross - $gatewayFee - $platformFee, 2);

        $order->update([
            'status' => 'paid',
            'paid_at' => now(),
            'payment_method' => $status['payment_method'] ?? null,
            'hotspot_username' => $username,
            'hotspot_password' => $password,
            'gateway_fee' => $gatewayFee,
            'platform_fee' => $platformFee,
            'operator_net' => $operatorNet,
        ]);

        // Credit the operator's logical wallet with their net earnings.
        $order->tenant?->postWallet('credit', $operatorNet, 'sale', [
            'reference' => $order->merchant_reference,
            'description' => 'Hotspot sale: ' . ($package->name ?? 'package'),
            'meta' => [
                'gross' => $gross,
                'gateway_fee' => $gatewayFee,
                'platform_fee' => $platformFee,
                'phone' => $order->phone,
            ],
        ]);

        Transaction::create([
            'tenant_id' => $order->tenant_id,
            'package_id' => $order->package_id,
            'reference' => $order->merchant_reference,
            'type' => 'subscription',
            'method' => $this->mapMethod($status['payment_method'] ?? ''),
            'amount' => $order->amount,
            'net_amount' => $order->amount,
            'currency' => $order->currency,
            'status' => 'completed',
            'external_reference' => $order->pesapal_tracking_id,
            'phone' => $order->phone,
            'notes' => 'Captive portal hotspot purchase',
            'paid_at' => now(),
        ]);
    }

    private function mapMethod(string $pesapalMethod): string
    {
        $m = strtolower($pesapalMethod);
        if (str_contains($m, 'airtel')) return 'airtel_money';
        if (str_contains($m, 'mtn') || str_contains($m, 'momo') || str_contains($m, 'mpesa')) return 'mtn_momo';
        if (str_contains($m, 'visa') || str_contains($m, 'master') || str_contains($m, 'card')) return 'card';
        return 'mtn_momo';
    }
}
