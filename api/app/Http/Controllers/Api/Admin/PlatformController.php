<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\HotspotUsage;
use App\Models\PortalOrder;
use App\Models\Router;
use App\Models\Tenant;
use App\Models\Transaction;
use App\Models\WalletTransaction;
use App\Notifications\WithdrawalNotification;
use App\Services\PayoutService;
use App\Services\WithdrawalNotifier;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Platform (super-admin) endpoints - cross-tenant insight and control.
 * Gated by the platform.admin middleware.
 */
class PlatformController extends Controller
{
    public function overview(Request $request): JsonResponse
    {
        // Calendar days in East Africa time (where every tenant is), converted to
        // UTC bounds. Defaults to this month so figures start fresh each month.
        $tz = 'Africa/Kampala';
        $to = ($request->filled('to') ? Carbon::parse($request->input('to'), $tz) : now($tz))->endOfDay()->utc();
        $from = ($request->filled('from') ? Carbon::parse($request->input('from'), $tz) : now($tz)->startOfMonth())->startOfDay()->utc();

        $paidOrders = PortalOrder::where('status', 'paid');

        // Revenue source 1 - commission on online hotspot sales (stored per order).
        $hotspotRevenue = (float) (clone $paidOrders)->sum('platform_fee');
        $gatewayFees = (float) (clone $paidOrders)->sum('gateway_fee');
        $gmv = (float) (clone $paidOrders)->sum('amount');
        $operatorEarnings = (float) (clone $paidOrders)->sum('operator_net');

        // Revenue source 2 - commission on redeemed vouchers (stored on the txn).
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

        // Mobile-money checkout health across the platform in the range.
        $orderStats = PortalOrder::whereBetween('created_at', [$from, $to])
            ->selectRaw('status, COUNT(*) as c, COALESCE(SUM(amount),0) as amount')
            ->groupBy('status')->get()->keyBy('status');
        $paidCount = (int) ($orderStats['paid']->c ?? 0);
        $failedCount = (int) ($orderStats['failed']->c ?? 0);

        // Sales volume (what operators sold) in the range, both channels.
        $periodSales = Transaction::where('status', 'completed')->whereBetween('paid_at', [$from, $to]);

        $topTenants = (clone $periodSales)
            ->join('tenants', 'tenants.id', '=', 'transactions.tenant_id')
            ->selectRaw('transactions.tenant_id as id, tenants.name, COUNT(*) as sales,
                SUM(transactions.amount) as gross, SUM(transactions.commission) as platform_revenue')
            ->groupBy('transactions.tenant_id', 'tenants.name')
            ->orderByDesc('gross')->limit(10)->get();

        $onlineCutoff = now()->subMinutes(3);

        // Things that need a platform admin's attention right now.
        $alerts = [];
        $offline = Router::with('tenant:id,name')
            ->where('is_active', true)
            ->whereNotNull('last_seen_at')
            ->where('last_seen_at', '<', now()->subMinutes(30))
            ->where('last_seen_at', '>', now()->subDays(7)) // long-dead test routers are just noise
            ->get(['id', 'tenant_id', 'name', 'last_seen_at']);
        foreach ($offline as $r) {
            $alerts[] = [
                'level' => 'warning', 'kind' => 'router_offline', 'tenant_id' => $r->tenant_id,
                'message' => "{$r->tenant?->name}: router \"{$r->name}\" offline since " . $r->last_seen_at->diffForHumans(),
            ];
        }
        $quiet = Transaction::where('status', 'completed')
            ->selectRaw('tenant_id, MAX(paid_at) as last_sale')
            ->groupBy('tenant_id')
            ->havingRaw('MAX(paid_at) < ? AND MAX(paid_at) > ?', [now()->subDays(2), now()->subDays(30)])
            ->get();
        $quietNames = Tenant::whereIn('id', $quiet->pluck('tenant_id'))->pluck('name', 'id');
        foreach ($quiet as $q) {
            $alerts[] = [
                'level' => 'info', 'kind' => 'quiet', 'tenant_id' => $q->tenant_id,
                'message' => ($quietNames[$q->tenant_id] ?? 'Tenant') . ': no sales since ' . Carbon::parse($q->last_sale)->diffForHumans(),
            ];
        }
        $stuck = DB::table('router_commands')->whereIn('status', ['pending', 'sent'])
            ->where('created_at', '<', now()->subMinutes(15))->where('created_at', '>', now()->subDay())->count();
        if ($stuck > 0) {
            $alerts[] = ['level' => 'info', 'kind' => 'stuck_commands', 'tenant_id' => null,
                'message' => "{$stuck} router command(s) waiting more than 15 minutes"];
        }
        $pendingCount = (clone $pendingWithdrawals)->count();
        if ($pendingCount > 0) {
            array_unshift($alerts, ['level' => 'critical', 'kind' => 'withdrawals', 'tenant_id' => null,
                'message' => "{$pendingCount} withdrawal(s) waiting to be released"]);
        }
        $recentFailures = PortalOrder::where('status', 'failed')->where('created_at', '>=', now()->subHour())->count();
        $recentPaid = PortalOrder::where('status', 'paid')->where('created_at', '>=', now()->subHour())->count();
        if ($recentFailures >= 5 && $recentFailures > $recentPaid) {
            array_unshift($alerts, ['level' => 'critical', 'kind' => 'payments_failing', 'tenant_id' => null,
                'message' => "{$recentFailures} mobile-money payments failed in the last hour (only {$recentPaid} succeeded)"]);
        }

        return response()->json([
            'tenants' => [
                'total' => Tenant::count(),
                'active' => Tenant::where('is_active', true)->count(),
                'selling_7d' => Transaction::where('status', 'completed')->where('paid_at', '>=', now()->subDays(7))->distinct('tenant_id')->count('tenant_id'),
                'new_in_range' => Tenant::whereBetween('created_at', [$from, $to])->count(),
            ],
            'routers' => [
                'total' => Router::count(),
                'online' => Router::where('last_seen_at', '>=', $onlineCutoff)->count(),
                'active_users' => (int) Router::where('last_seen_at', '>=', $onlineCutoff)->sum('active_users'),
            ],
            'payments' => [
                'paid' => $paidCount,
                'failed' => $failedCount,
                'pending' => (int) ($orderStats['pending']->c ?? 0),
                'success_rate' => ($paidCount + $failedCount) > 0 ? round($paidCount / ($paidCount + $failedCount) * 100, 1) : null,
            ],
            'sales' => [
                'gross' => (float) (clone $periodSales)->sum('amount'),
                'count' => (clone $periodSales)->count(),
                'mobile_money' => (float) (clone $periodSales)->where('type', '<>', 'voucher')->sum('amount'),
                'voucher' => (float) (clone $periodSales)->where('type', 'voucher')->sum('amount'),
            ],
            'top_tenants' => $topTenants,
            'alerts' => $alerts,
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
            // Where platform revenue comes from - all-time and within the range.
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
            'range' => ['from' => $from->copy()->timezone($tz)->toDateString(), 'to' => $to->copy()->timezone($tz)->toDateString()],
        ]);
    }

    public function tenants(Request $request): JsonResponse
    {
        $since30 = now()->subDays(30);
        $since7 = now()->subDays(7);
        // Month figures follow East Africa time, where every tenant is.
        $monthStart = now('Africa/Kampala')->startOfMonth()->utc();

        // One grouped query per figure instead of a query per tenant.
        $sales = Transaction::where('status', 'completed')
            ->selectRaw('tenant_id,
                COALESCE(SUM(amount),0) as gross,
                COALESCE(SUM(commission),0) as platform_revenue,
                COALESCE(SUM(CASE WHEN paid_at >= ? THEN amount ELSE 0 END),0) as gross_month,
                COALESCE(SUM(CASE WHEN paid_at >= ? THEN amount ELSE 0 END),0) as gross_7d,
                SUM(CASE WHEN paid_at >= ? THEN 1 ELSE 0 END) as sales_month,
                MAX(paid_at) as last_sale_at', [$monthStart, $since7, $monthStart])
            ->groupBy('tenant_id')->get()->keyBy('tenant_id');

        $routers = Router::selectRaw('tenant_id, COUNT(*) as total,
                SUM(CASE WHEN last_seen_at >= ? THEN 1 ELSE 0 END) as online,
                COALESCE(SUM(CASE WHEN last_seen_at >= ? THEN active_users ELSE 0 END),0) as active_users,
                MAX(last_seen_at) as last_seen_at', [now()->subMinutes(3), now()->subMinutes(3)])
            ->groupBy('tenant_id')->get()->keyBy('tenant_id');

        $subscribers = DB::table('subscribers')->whereNull('deleted_at')
            ->where('status', 'active')->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->selectRaw('tenant_id, COUNT(*) as c')->groupBy('tenant_id')->pluck('c', 'tenant_id');

        $orders = PortalOrder::where('created_at', '>=', $since30)
            ->selectRaw("tenant_id, SUM(CASE WHEN status='paid' THEN 1 ELSE 0 END) as paid, SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed")
            ->groupBy('tenant_id')->get()->keyBy('tenant_id');

        $lastLogin = DB::table('personal_access_tokens')
            ->join('users', 'users.id', '=', 'personal_access_tokens.tokenable_id')
            ->where('personal_access_tokens.tokenable_type', \App\Models\User::class)
            ->selectRaw('users.tenant_id, MAX(personal_access_tokens.last_used_at) as last_active_at')
            ->groupBy('users.tenant_id')->pluck('last_active_at', 'users.tenant_id');

        $tenants = Tenant::withCount('users')
            ->orderByDesc('created_at')
            ->get()
            ->map(function (Tenant $t) use ($sales, $routers, $subscribers, $orders, $lastLogin, $since7) {
                $s = $sales[$t->id] ?? null;
                $r = $routers[$t->id] ?? null;
                $o = $orders[$t->id] ?? null;
                $paid = (int) ($o->paid ?? 0);
                $failed = (int) ($o->failed ?? 0);
                $routersTotal = (int) ($r->total ?? 0);
                $routersOnline = (int) ($r->online ?? 0);
                $lastSale = $s?->last_sale_at ? Carbon::parse($s->last_sale_at) : null;

                // A quick health label so problem accounts stand out in the list.
                $health = match (true) {
                    !$t->is_active => 'suspended',
                    $routersTotal === 0 => 'setup',
                    !$lastSale => 'no_sales',
                    $routersOnline < $routersTotal => 'router_offline',
                    $lastSale->lt($since7) => 'quiet',
                    default => 'healthy',
                };

                return [
                    'id' => $t->id,
                    'name' => $t->name,
                    'email' => $t->email,
                    'phone' => $t->phone,
                    'plan' => $t->plan,
                    'is_active' => $t->is_active,
                    'currency' => $t->currency,
                    'routers_count' => $routersTotal,
                    'routers_online' => $routersOnline,
                    'active_users' => (int) ($r->active_users ?? 0),
                    'users_count' => $t->users_count,
                    'wallet_balance' => (float) $t->wallet_balance,
                    'gross_revenue' => (float) ($s->gross ?? 0),
                    'gross_month' => (float) ($s->gross_month ?? 0),
                    'gross_7d' => (float) ($s->gross_7d ?? 0),
                    'sales_month' => (int) ($s->sales_month ?? 0),
                    'platform_revenue' => (float) ($s->platform_revenue ?? 0),
                    'active_subscribers' => (int) ($subscribers[$t->id] ?? 0),
                    'payment_success_rate' => ($paid + $failed) > 0 ? round($paid / ($paid + $failed) * 100, 1) : null,
                    'last_sale_at' => $lastSale,
                    'last_active_at' => $lastLogin[$t->id] ?? null,
                    'health' => $health,
                    'voucher_commission_enabled' => $t->voucher_commission_enabled,
                    'voucher_commission_rate' => (float) $t->voucher_commission_rate,
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
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|nullable|email|max:255',
            'phone' => 'sometimes|nullable|string|max:30',
            'trial_ends_at' => 'sometimes|nullable|date',
            'voucher_commission_enabled' => 'sometimes|boolean',
            'voucher_commission_rate' => 'sometimes|numeric|min:0|max:100',
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

    public function releaseWithdrawal(Request $request, WalletTransaction $transaction, PayoutService $payouts, WithdrawalNotifier $notifier): JsonResponse
    {
        abort_unless($transaction->source === 'withdrawal' && $transaction->type === 'debit', 422, 'Not a withdrawal.');
        abort_unless($payouts->settle($transaction, 'completed'), 422, 'This withdrawal is already ' . $transaction->fresh()->status . '.');

        $notifier->notifyOperator($transaction, WithdrawalNotification::COMPLETED);

        return response()->json(['message' => 'Withdrawal marked as paid out.', 'transaction' => $transaction]);
    }

    public function failWithdrawal(Request $request, WalletTransaction $transaction, PayoutService $payouts, WithdrawalNotifier $notifier): JsonResponse
    {
        abort_unless($transaction->source === 'withdrawal' && $transaction->type === 'debit', 422, 'Not a withdrawal.');
        // Only an unsettled withdrawal can be failed - failing one that was
        // already paid out used to refund money the operator had received.
        abort_unless($payouts->settle($transaction, 'failed'), 422, 'This withdrawal is already ' . $transaction->fresh()->status . '.');

        // Refund the reserved amount back to the operator's wallet.
        $transaction->tenant?->postWallet('credit', (float) $transaction->amount, 'adjustment', [
            'description' => 'Refund: failed withdrawal #' . $transaction->id,
            'reference' => $transaction->reference,
        ]);

        $notifier->notifyOperator($transaction, WithdrawalNotification::FAILED);

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
