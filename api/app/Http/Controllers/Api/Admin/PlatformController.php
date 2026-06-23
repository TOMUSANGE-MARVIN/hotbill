<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\HotspotUsage;
use App\Models\PortalOrder;
use App\Models\Router;
use App\Models\Tenant;
use App\Models\Transaction;
use App\Models\WalletTransaction;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Platform (super-admin) endpoints — cross-tenant insight and control.
 * Gated by the platform.admin middleware.
 */
class PlatformController extends Controller
{
    public function overview(Request $request): JsonResponse
    {
        $to = Carbon::parse($request->input('to', now()))->endOfDay();
        $from = Carbon::parse($request->input('from', now()->copy()->subDays(29)))->startOfDay();

        $paidOrders = PortalOrder::where('status', 'paid');

        // Revenue source 1 — commission on online hotspot sales (stored per order).
        $hotspotRevenue = (float) (clone $paidOrders)->sum('platform_fee');
        $gatewayFees = (float) (clone $paidOrders)->sum('gateway_fee');
        $gmv = (float) (clone $paidOrders)->sum('amount');
        $operatorEarnings = (float) (clone $paidOrders)->sum('operator_net');

        // Revenue source 2 — commission on redeemed vouchers (stored on the txn).
        $voucherTxns = Transaction::where('type', 'voucher')->where('status', 'completed');
        $voucherRevenue = (float) (clone $voucherTxns)->sum('commission');
        $voucherCount = (clone $voucherTxns)->count();

        $platformRevenue = round($hotspotRevenue + $voucherRevenue, 2);

        // Period (selected range) figures, per source.
        $periodHotspot = (float) PortalOrder::where('status', 'paid')
            ->whereBetween('paid_at', [$from, $to])->sum('platform_fee');
        $periodVoucher = (float) Transaction::where('type', 'voucher')->where('status', 'completed')
            ->whereBetween('paid_at', [$from, $to])->sum('commission');
        $periodRevenue = round($periodHotspot + $periodVoucher, 2);

        // Daily series merged from both sources so the chart shows total + split.
        $hotspotByDay = PortalOrder::where('status', 'paid')
            ->whereBetween('paid_at', [$from, $to])
            ->selectRaw('DATE(paid_at) as date, SUM(platform_fee) as amount')
            ->groupBy('date')->get()->keyBy('date');
        $voucherByDay = Transaction::where('type', 'voucher')->where('status', 'completed')
            ->whereBetween('paid_at', [$from, $to])
            ->selectRaw('DATE(paid_at) as date, SUM(commission) as amount')
            ->groupBy('date')->get()->keyBy('date');

        $revenueSeries = $hotspotByDay->keys()->merge($voucherByDay->keys())
            ->unique()->sort()->values()
            ->map(function ($date) use ($hotspotByDay, $voucherByDay) {
                $h = (float) ($hotspotByDay[$date]->amount ?? 0);
                $v = (float) ($voucherByDay[$date]->amount ?? 0);
                return ['date' => $date, 'hotspot' => $h, 'voucher' => $v, 'revenue' => round($h + $v, 2)];
            });

        $pendingWithdrawals = WalletTransaction::where('type', 'debit')
            ->where('source', 'withdrawal')
            ->whereIn('status', ['pending', 'processing']);

        return response()->json([
            'tenants' => [
                'total' => Tenant::count(),
                'active' => Tenant::where('is_active', true)->count(),
            ],
            'routers' => [
                'total' => Router::count(),
                'online' => Router::where('status', 'online')->count(),
            ],
            'customers' => HotspotUsage::distinct('username')->count('username'),
            'data_bytes' => (int) HotspotUsage::sum(DB::raw('bytes_in + bytes_out')),
            'finance' => [
                'gmv' => $gmv,
                'platform_revenue' => $platformRevenue,
                'gateway_fees' => $gatewayFees,
                'operator_earnings' => $operatorEarnings,
                'period_revenue' => $periodRevenue,
                'operator_wallet_liability' => (float) Tenant::sum('wallet_balance'),
            ],
            // Where platform revenue comes from — all-time and within the range.
            'revenue_by_source' => [
                [
                    'source' => 'hotspot',
                    'label' => 'Hotspot sales',
                    'amount' => $hotspotRevenue,
                    'period' => $periodHotspot,
                ],
                [
                    'source' => 'voucher',
                    'label' => 'Voucher commission',
                    'amount' => $voucherRevenue,
                    'period' => $periodVoucher,
                    'count' => $voucherCount,
                ],
            ],
            'withdrawals' => [
                'pending_count' => (clone $pendingWithdrawals)->count(),
                'pending_amount' => (float) (clone $pendingWithdrawals)->sum('amount'),
            ],
            'revenue_series' => $revenueSeries,
            'range' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
        ]);
    }

    public function tenants(Request $request): JsonResponse
    {
        $tenants = Tenant::withCount(['routers', 'users'])
            ->orderByDesc('created_at')
            ->get()
            ->map(function (Tenant $t) {
                $revenue = (float) PortalOrder::where('tenant_id', $t->id)->where('status', 'paid')->sum('amount');
                return [
                    'id' => $t->id,
                    'name' => $t->name,
                    'email' => $t->email,
                    'plan' => $t->plan,
                    'is_active' => $t->is_active,
                    'currency' => $t->currency,
                    'routers_count' => $t->routers_count,
                    'users_count' => $t->users_count,
                    'wallet_balance' => (float) $t->wallet_balance,
                    'gross_revenue' => $revenue,
                    'created_at' => $t->created_at,
                ];
            });

        return response()->json($tenants);
    }

    public function updateTenant(Request $request, Tenant $tenant): JsonResponse
    {
        $data = $request->validate([
            'is_active' => 'sometimes|boolean',
            'plan' => 'sometimes|in:free,pro,enterprise',
        ]);

        $tenant->update($data);

        return response()->json($tenant);
    }

    public function withdrawals(Request $request): JsonResponse
    {
        $query = WalletTransaction::where('type', 'debit')
            ->where('source', 'withdrawal')
            ->with('tenant:id,name,payout_phone,payout_provider')
            ->latest();

        if ($request->status) $query->where('status', $request->status);

        return response()->json($query->limit(200)->get());
    }

    public function releaseWithdrawal(Request $request, WalletTransaction $transaction): JsonResponse
    {
        abort_unless($transaction->source === 'withdrawal' && $transaction->type === 'debit', 422, 'Not a withdrawal.');

        $transaction->update(['status' => 'completed']);

        return response()->json(['message' => 'Withdrawal marked as paid out.', 'transaction' => $transaction]);
    }

    public function failWithdrawal(Request $request, WalletTransaction $transaction): JsonResponse
    {
        abort_unless($transaction->source === 'withdrawal' && $transaction->type === 'debit', 422, 'Not a withdrawal.');
        abort_if($transaction->status === 'failed', 422, 'Already failed.');

        // Refund the reserved amount back to the operator's wallet.
        $transaction->tenant?->postWallet('credit', (float) $transaction->amount, 'adjustment', [
            'description' => 'Refund: failed withdrawal #' . $transaction->id,
            'reference' => $transaction->reference,
        ]);
        $transaction->update(['status' => 'failed']);

        return response()->json(['message' => 'Withdrawal failed and refunded to operator wallet.']);
    }

    public function transactions(Request $request): JsonResponse
    {
        $txns = Transaction::with('tenant:id,name')
            ->latest()
            ->limit(200)
            ->get();

        return response()->json($txns);
    }

    public function routers(Request $request): JsonResponse
    {
        $routers = Router::with('tenant:id,name')
            ->orderByDesc('last_seen_at')
            ->get(['id', 'tenant_id', 'name', 'status', 'cpu_load', 'uptime', 'ros_version', 'model', 'last_seen_at', 'active_users']);

        return response()->json($routers);
    }
}
