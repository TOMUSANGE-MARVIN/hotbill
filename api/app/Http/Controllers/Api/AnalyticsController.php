<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HotspotUsage;
use App\Models\HotspotUsageDaily;
use App\Models\Package;
use App\Models\Router;
use App\Models\Subscriber;
use App\Models\Transaction;
use App\Models\SubscriberSession;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $start = $request->start_date ?? now()->startOfMonth()->toDateString();
        $end = $request->end_date ?? now()->toDateString();

        $range = [$start . ' 00:00:00', $end . ' 23:59:59'];

        // Sales summary
        $salesBase = Transaction::where('tenant_id', $tenantId)
            ->where('status', 'completed')
            ->whereBetween('paid_at', $range);

        $netSales = $salesBase->sum('net_amount');
        $commission = $salesBase->sum('commission');
        $grossSales = $salesBase->sum('amount');

        $agentSales = (clone $salesBase)->whereNotNull('agent_id')->sum('amount');
        $mmSales = (clone $salesBase)->whereIn('method', ['mtn_momo', 'airtel_money'])->sum('amount');
        $agentCommission = (clone $salesBase)->whereNotNull('agent_id')->sum('commission');
        $mmCommission = (clone $salesBase)->whereIn('method', ['mtn_momo', 'airtel_money'])->sum('commission');

        // System insights
        $routers = Router::where('tenant_id', $tenantId)->get();
        $activeUsers = $routers->sum('active_users');
        $avgCpu = $routers->avg('cpu_load');
        $totalDataGb = round($routers->sum('data_rx') / (1024 ** 3), 1);

        // Subscribers
        $activeSubscribers = Subscriber::where('tenant_id', $tenantId)->where('status', 'active')->count();
        $expiredToday = Subscriber::where('tenant_id', $tenantId)
            ->whereDate('expires_at', today())->count();

        // Recent sales
        $recentSales = Transaction::where('tenant_id', $tenantId)
            ->where('status', 'completed')
            ->with('subscriber:id,full_name,username')
            ->latest('paid_at')
            ->limit(10)
            ->get(['id', 'subscriber_id', 'amount', 'method', 'paid_at']);

        // Daily chart
        $daily = Transaction::where('tenant_id', $tenantId)
            ->where('status', 'completed')
            ->whereBetween('paid_at', $range)
            ->selectRaw('DATE(paid_at) as date, SUM(net_amount) as net_revenue, SUM(commission) as commission, SUM(amount) as gross_revenue, 0 as expense')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return response()->json([
            'net_sales' => $netSales,
            'gross_sales' => $grossSales,
            'commission' => $commission,
            'agent_sales' => $agentSales,
            'mm_sales' => $mmSales,
            'agent_commission' => $agentCommission,
            'mm_commission' => $mmCommission,
            'active_users' => $activeUsers,
            'avg_cpu' => round($avgCpu ?? 0),
            'total_data_gb' => $totalDataGb,
            'active_subscribers' => $activeSubscribers,
            'expired_today' => $expiredToday,
            'account_credit' => 0, // prepaid balance — extend later
            'recent_sales' => $recentSales,
            'daily' => $daily,
        ]);
    }

    /**
     * Usage analytics built entirely from real hotspot usage collected off the
     * routers (CollectHotspotUsageJob). All figures are measured, not estimated.
     */
    public function usageAnalytics(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $to = Carbon::parse($request->input('to', now()))->endOfDay();
        $from = Carbon::parse($request->input('from', now()->copy()->subDays(29)))->startOfDay();
        $days = max(1, $from->diffInDays($to) + 1);
        $prevTo = $from->copy()->subSecond();
        $prevFrom = $from->copy()->subDays($days);

        // ── Daily series (real byte deltas) ──────────────────────────
        $dailyRows = HotspotUsageDaily::where('tenant_id', $tenantId)
            ->whereBetween('date', [$from->toDateString(), $to->toDateString()])
            ->get(['date', 'bytes', 'sessions'])
            ->keyBy(fn ($r) => Carbon::parse($r->date)->toDateString());

        $series = [];
        for ($d = $from->copy(); $d->lte($to); $d->addDay()) {
            $key = $d->toDateString();
            $series[] = ['date' => $key, 'bytes' => (int) ($dailyRows[$key]->bytes ?? 0)];
        }

        $totalData = (int) collect($series)->sum('bytes');
        $totalSessions = (int) $dailyRows->sum('sessions');

        $prevData = (int) HotspotUsageDaily::where('tenant_id', $tenantId)
            ->whereBetween('date', [$prevFrom->toDateString(), $prevTo->toDateString()])->sum('bytes');
        $prevSessions = (int) HotspotUsageDaily::where('tenant_id', $tenantId)
            ->whereBetween('date', [$prevFrom->toDateString(), $prevTo->toDateString()])->sum('sessions');

        // ── Users in period ──────────────────────────────────────────
        $uniqueUsers = HotspotUsage::where('tenant_id', $tenantId)
            ->whereBetween('last_seen_at', [$from, $to])->count();
        $prevUsers = HotspotUsage::where('tenant_id', $tenantId)
            ->whereBetween('last_seen_at', [$prevFrom, $prevTo])->count();

        $totalUptime = (int) HotspotUsage::where('tenant_id', $tenantId)->sum('uptime_seconds');
        $allSessions = (int) HotspotUsage::where('tenant_id', $tenantId)->sum('sessions');
        $avgSession = $allSessions > 0 ? intdiv($totalUptime, $allSessions) : 0;

        // ── Top data users ───────────────────────────────────────────
        $topUsers = HotspotUsage::where('tenant_id', $tenantId)
            ->with('package:id,name')
            ->orderByRaw('(bytes_in + bytes_out) desc')
            ->limit(10)
            ->get()
            ->map(fn ($u) => [
                'username' => $u->username,
                'phone' => $u->phone ?: $u->username,
                'bytes' => (int) $u->bytes_in + (int) $u->bytes_out,
                'sessions' => (int) $u->sessions,
                'package' => $u->package?->name,
            ]);

        // ── Data per package ─────────────────────────────────────────
        $perPackage = HotspotUsage::where('tenant_id', $tenantId)
            ->selectRaw('package_id, SUM(bytes_in + bytes_out) as bytes')
            ->groupBy('package_id')
            ->get()
            ->map(fn ($r) => [
                'package' => Package::find($r->package_id)?->name ?? 'Unknown',
                'bytes' => (int) $r->bytes,
            ])
            ->sortByDesc('bytes')
            ->values();

        return response()->json([
            'range' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'overview' => [
                'total_data_bytes' => $totalData,
                'unique_users' => $uniqueUsers,
                'avg_session_seconds' => $avgSession,
                'total_sessions' => $totalSessions,
                'deltas' => [
                    'data' => $this->pctChange($totalData, $prevData),
                    'users' => $this->pctChange($uniqueUsers, $prevUsers),
                    'sessions' => $this->pctChange($totalSessions, $prevSessions),
                ],
            ],
            'data_over_time' => $series,
            'top_users' => $topUsers,
            'data_per_package' => $perPackage,
        ]);
    }

    private function pctChange(float $current, float $previous): ?float
    {
        if ($previous <= 0) return $current > 0 ? 100.0 : null;
        return round((($current - $previous) / $previous) * 100, 1);
    }
}
