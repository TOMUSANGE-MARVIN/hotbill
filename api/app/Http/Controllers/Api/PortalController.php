<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Package;
use App\Models\PortalOrder;
use App\Models\Router;
use App\Models\Transaction;
use App\Models\Voucher;
use App\Services\MarzPayService;
use App\Services\MikrotikService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Public captive-portal endpoints (no auth). A hotspot client lands here after
 * the router redirects them, picks a package, pays via MarzPay, and is then
 * auto-logged-in with a one-time hotspot credential shaped by the package.
 */
class PortalController extends Controller
{
    public function __construct(
        private MarzPayService $marzpay,
        private \App\Services\PayoutService $payouts,
    ) {}

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
            'currency' => $router->tenant?->currency ?? config('hotbill.marzpay.currency'),
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
     * Public: create an order and fire the MarzPay mobile-money prompt straight
     * to the customer's phone (no redirect). The portal then polls status until
     * the webhook confirms payment.
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

        if (!$this->marzpay->isConfigured()) {
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
            'currency' => $package->currency ?? config('hotbill.marzpay.currency'),
            'status' => 'pending',
            // MarzPay requires a UUID v4 reference; reuse it as our public reference.
            'merchant_reference' => (string) Str::uuid(),
            'client_mac' => $data['mac'] ?? null,
            'client_ip' => $data['ip'] ?? null,
            'link_login' => $data['link_login'] ?? null,
        ]);

        try {
            $result = $this->marzpay->collectMoney(
                (int) round((float) $order->amount),
                $order->phone,
                $order->merchant_reference,
                Str::limit($package->name . ' @ ' . $router->name, 90),
                rtrim(config('app.url'), '/') . '/api/v1/portal/marzpay/webhook',
            );
        } catch (\Throwable $e) {
            $order->update(['status' => 'failed']);
            Log::error('Portal payment init failed', ['order' => $order->id, 'error' => $e->getMessage()]);
            return response()->json(['message' => 'Could not start payment. Please try again.'], 502);
        }

        // Keep MarzPay's transaction uuid for the status-poll fallback.
        $order->update(['pesapal_tracking_id' => $result['transaction']['uuid'] ?? null]);

        return response()->json([
            'reference' => $order->merchant_reference,
            'prompt_sent' => true,
        ]);
    }

    /**
     * Public: redeem a pre-sold voucher. Provisions the same one-time hotspot
     * session as a paid order (so auto-login is identical) — no payment, no
     * wallet credit (the operator already collected cash for the voucher).
     */
    public function redeem(Request $request): JsonResponse
    {
        $data = $request->validate([
            'router_id' => 'required|exists:routers,id',
            'code' => 'required|string|max:40',
            'mac' => 'nullable|string|max:32',
            'ip' => 'nullable|string|max:45',
            'link_login' => 'nullable|string',
        ]);

        $router = Router::findOrFail($data['router_id']);
        $voucher = Voucher::where('code', strtoupper(trim($data['code'])))
            ->where('tenant_id', $router->tenant_id)
            ->first();

        if (!$voucher || $voucher->status !== 'unused') {
            return response()->json(['message' => 'Invalid or already-used voucher code.'], 422);
        }

        $package = $voucher->package;
        if (!$package) {
            return response()->json(['message' => 'This voucher has no package configured.'], 422);
        }

        $username = 'V' . $voucher->code;
        $password = strtoupper(Str::random(6));

        try {
            $mikrotik = MikrotikService::connect_to($router);
            $mikrotik->createHotspotSession(
                $username,
                $password,
                $package->mikrotik_rate_limit,
                $package->mikrotik_limit_uptime ?: null,
                $package->data_limit_bytes,
            );
            $mikrotik->disconnect();
        } catch (\Throwable $e) {
            Log::error('Portal voucher provisioning failed', ['voucher' => $voucher->id, 'error' => $e->getMessage()]);
            return response()->json(['message' => 'Could not activate your voucher. Please try again.'], 502);
        }

        $expiresAt = $package->mikrotik_limit_uptime
            ? now()->addDays($package->duration_days ?? 0)->addHours($package->duration_hours ?? 0)->addMinutes($package->duration_minutes ?? 0)
            : null;

        $voucher->update([
            'status' => 'active',
            'router_id' => $router->id,
            'used_by_username' => $username,
            'used_at' => now(),
            'expires_at' => $expiresAt,
        ]);

        Transaction::create([
            'tenant_id' => $voucher->tenant_id,
            'voucher_id' => $voucher->id,
            'package_id' => $package->id,
            'reference' => 'VCH-' . $voucher->code,
            'type' => 'voucher',
            'method' => 'cash',
            'amount' => $voucher->price,
            'net_amount' => $voucher->price,
            'currency' => $router->tenant?->currency ?? config('hotbill.marzpay.currency'),
            'status' => 'completed',
            'notes' => 'Captive portal voucher redemption',
            'paid_at' => now(),
        ]);

        return response()->json([
            'status' => 'paid',
            'package' => $package->name,
            'username' => $username,
            'password' => $password,
            'link_login' => $data['link_login'] ?? null,
        ]);
    }

    /**
     * Public: portal polls this by merchant_reference. Re-checks MarzPay if still
     * pending (covers delayed webhook), and returns credentials once paid.
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
     * Verify a MarzPay collection against the API (the webhook is unsigned, so we
     * always re-check before fulfilling). Idempotent — a no-op once paid.
     */
    private function reconcile(PortalOrder $order): void
    {
        if ($order->status === 'paid') return;
        if (!$order->pesapal_tracking_id) return;

        $data = $this->marzpay->getCollectionDetails($order->pesapal_tracking_id);
        $txn = $data['data']['transaction'] ?? $data['transaction'] ?? [];
        $st = strtolower($txn['status'] ?? '');
        $providerName = $data['data']['collection']['provider'] ?? $order->provider ?? '';

        if (in_array($st, ['completed', 'successful', 'success'])) {
            $this->fulfill($order, $providerName);
        } elseif (in_array($st, ['failed', 'declined', 'cancelled', 'reversed'])) {
            $order->update(['status' => 'failed']);
        }
        // 'processing'/'pending' → leave as-is, portal keeps polling
    }

    /**
     * Public: MarzPay collection webhook. Re-verifies against the API, then
     * fulfills. Returns 200 regardless so MarzPay doesn't retry needlessly.
     */
    public function marzpayWebhook(Request $request): JsonResponse
    {
        $event = (string) $request->input('event_type');
        $reference = $request->input('transaction.reference');

        if ($reference && str_starts_with($event, 'collection.')) {
            $order = PortalOrder::where('merchant_reference', $reference)->first();
            if ($order) {
                try {
                    $this->reconcile($order);
                } catch (\Throwable $e) {
                    Log::error('MarzPay webhook reconcile failed', ['ref' => $reference, 'error' => $e->getMessage()]);
                }
            }
        }

        return response()->json(['status' => 'ok']);
    }

    /**
     * Public: MarzPay disbursement (operator payout) webhook.
     */
    public function marzpayPayoutWebhook(Request $request): JsonResponse
    {
        try {
            $this->payouts->handleDisbursementWebhook($request->all());
        } catch (\Throwable $e) {
            Log::error('MarzPay payout webhook failed', ['error' => $e->getMessage()]);
        }

        return response()->json(['status' => 'ok']);
    }

    /**
     * Create the one-time hotspot user on the router and mark the order paid.
     */
    private function fulfill(PortalOrder $order, ?string $paymentMethod = null): void
    {
        // Atomic claim — the webhook and the status-poll can fire fulfill() at the
        // same time; only the caller that flips pending→paid proceeds, so the
        // wallet is credited once and the transaction is inserted once.
        $claimed = PortalOrder::whereKey($order->id)->where('status', '!=', 'paid')->update(['status' => 'paid']);
        if ($claimed === 0) return;

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

        // Fee split: payment-gateway fee + HotBill platform commission; operator keeps the rest.
        $gross = (float) $order->amount;
        $gatewayFee = round($gross * (float) config('hotbill.marzpay.fee_percent') / 100, 2);
        $platformFee = round($gross * (float) config('hotbill.platform.commission_percent') / 100, 2);
        $operatorNet = round($gross - $gatewayFee - $platformFee, 2);

        $order->update([
            'status' => 'paid',
            'paid_at' => now(),
            'payment_method' => $paymentMethod,
            'hotspot_username' => $username,
            'hotspot_password' => $password,
            'gateway_fee' => $gatewayFee,
            'platform_fee' => $platformFee,
            'operator_net' => $operatorNet,
        ]);

        // Credit the operator's logical wallet with their net earnings.
        $walletTxn = $order->tenant?->postWallet('credit', $operatorNet, 'sale', [
            'reference' => $order->merchant_reference,
            'description' => 'Hotspot sale: ' . ($package->name ?? 'package'),
            'meta' => [
                'gross' => $gross,
                'gateway_fee' => $gatewayFee,
                'platform_fee' => $platformFee,
                'phone' => $order->phone,
            ],
        ]);

        // The fee charged to the operator on this sale (gateway + platform).
        $fee = round($gatewayFee + $platformFee, 2);

        Transaction::create([
            'tenant_id' => $order->tenant_id,
            'package_id' => $order->package_id,
            'reference' => $order->merchant_reference,
            'type' => 'subscription',
            'method' => $this->mapMethod((string) $paymentMethod),
            'amount' => $order->amount,
            'commission' => $fee,
            'net_amount' => $operatorNet,
            'currency' => $order->currency,
            'status' => 'completed',
            'external_reference' => $order->pesapal_tracking_id,
            'phone' => $order->phone,
            'notes' => 'Captive portal hotspot purchase',
            'paid_at' => now(),
            'meta' => [
                'gateway_fee' => $gatewayFee,
                'platform_fee' => $platformFee,
                'balance_after' => $walletTxn ? (float) $walletTxn->balance_after : null,
            ],
        ]);
    }

    private function mapMethod(string $method): string
    {
        $m = strtolower($method);
        if (str_contains($m, 'airtel')) return 'airtel_money';
        if (str_contains($m, 'mtn') || str_contains($m, 'momo') || str_contains($m, 'mpesa')) return 'mtn_momo';
        if (str_contains($m, 'visa') || str_contains($m, 'master') || str_contains($m, 'card')) return 'card';
        return 'mtn_momo';
    }
}
