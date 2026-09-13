<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HotspotUsage;
use App\Models\HotspotUsageDaily;
use App\Models\Package;
use App\Models\Router;
use App\Models\Subscriber;
use App\Models\Tenant;
use App\Models\Transaction;
use App\Models\SubscriberSession;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $tz = Tenant::find($tenantId)?->timezone ?: config('app.timezone');

        // The dashboard sends `start`/`end`; accept the legacy `start_date`/`end_date`
        // names too. Without this the range silently fell back to the current month,
        // so at every month boundary the dashboard showed zeros for prior data.
        $start = $request->input('start', $request->input('start_date')) ?? now($tz)->startOfMonth()->toDateString();
        $end = $request->input('end', $request->input('end_date')) ?? now($tz)->toDateString();

        // `paid_at` is stored in UTC (app.timezone), but $start/$end are calendar
        // dates in the tenant's own local timezone - interpreting them as literal
        // UTC boundaries (the old behavior) misattributes every sale in the first
        // few hours of the local day to the previous day's totals instead. This
        // is exactly the "yesterday's numbers don't tally" bug: a Uganda (EAT,
        // UTC+3) sale at 01:00 local is stored as 22:00 UTC the day before, so a
        // naive UTC range for "yesterday" silently excludes it.
        $range = [
            Carbon::parse($start, $tz)->startOfDay()->utc()->toDateTimeString(),
            Carbon::parse($end, $tz)->endOfDay()->utc()->toDateTimeString(),
        ];

        // These aggregates scan growing tables on every dashboard load, so cache
        // the assembled payload for a short window (per tenant + date range).
        $payload = Cache::remember(
            "dashboard:{$tenantId}:{$start}:{$end}",
            60,
            fn () => $this->buildDashboard($tenantId, $range, $tz)
        );

        return response()->json($payload);
    }

    private function buildDashboard(int $tenantId, array $range, string $tz): array
    {
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
        $voucherSales = (clone $salesBase)->where('type', 'voucher')->sum('amount');
        // "Today" also has to mean the tenant's local calendar day, not UTC's -
        // same reasoning as the range above.
        $todayRange = [now($tz)->startOfDay()->utc()->toDateTimeString(), now($tz)->endOfDay()->utc()->toDateTimeString()];
        $salesToday = Transaction::where('tenant_id', $tenantId)
            ->where('status', 'completed')
            ->whereBetween('paid_at', $todayRange)
            ->count();

        // System insights - "live" figures only count routers reporting right now.
        $routers = Router::where('tenant_id', $tenantId)->get();
        $onlineRouters = $routers->filter(fn (Router $r) => $r->isOnline());
        $activeUsers = $onlineRouters->sum('active_users');
        $avgCpu = $onlineRouters->avg('cpu_load');
        $systemOnline = $onlineRouters->isNotEmpty();
        $balance = (float) (Tenant::find($tenantId)?->wallet_balance ?? 0);
        // Real, measured hotspot data for the period (populated by
        // CollectHotspotUsageJob). The per-router data_rx counter isn't
        // reported by the heartbeat, so it can't be the source here.
        $dataBytes = HotspotUsageDaily::where('tenant_id', $tenantId)
            ->whereBetween('date', [substr($range[0], 0, 10), substr($range[1], 0, 10)])
            ->sum('bytes');
        $totalDataGb = round($dataBytes / (1024 ** 3), 1);

        // Subscribers
        $activeSubscribers = Subscriber::where('tenant_id', $tenantId)->where('status', 'active')->count();
        $expiredToday = Subscriber::where('tenant_id', $tenantId)
            ->whereBetween('expires_at', $todayRange)->count();

        // Recent sales
        $recentSales = Transaction::where('tenant_id', $tenantId)
            ->where('status', 'completed')
            ->with(['subscriber:id,full_name,username', 'voucher:id,code'])
            ->latest('paid_at')
            ->limit(20)
            ->get(['id', 'subscriber_id', 'voucher_id', 'type', 'amount', 'method', 'paid_at']);

        // Filter options for the Overview chart dropdown - distinct subscribers
        // who bought something in range, so the dropdown mirrors real activity.
        $subscriberFilters = Transaction::where('tenant_id', $tenantId)
            ->where('status', 'completed')
            ->whereBetween('paid_at', $range)
            ->whereNotNull('subscriber_id')
            ->with('subscriber:id,full_name,username,email')
            ->get(['subscriber_id'])
            ->pluck('subscriber')
            ->filter()
            ->unique('id')
            ->map(fn ($s) => [
                'id' => $s->id,
                'label' => $s->email ?: ($s->full_name ?: $s->username),
            ])
            ->values();

        // Daily chart - group by the tenant's local calendar date, not the UTC
        // date paid_at happens to be stored in (same fix as the range above:
        // a bare DATE(paid_at) would still split one local day's sales across
        // two bars for anything sold in the first few hours of the local day).
        $offset = $this->tzOffset($tz);
        $daily = Transaction::where('tenant_id', $tenantId)
            ->where('status', 'completed')
            ->whereBetween('paid_at', $range)
            ->selectRaw("DATE(CONVERT_TZ(paid_at, '+00:00', '{$offset}')) as date, SUM(net_amount) as net_revenue, SUM(commission) as commission, SUM(amount) as gross_revenue, 0 as expense")
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return [
            'net_sales' => $netSales,
            'gross_sales' => $grossSales,
            'commission' => $commission,
            'agent_sales' => $agentSales,
            'mm_sales' => $mmSales,
            'voucher_sales' => $voucherSales,
            'agent_commission' => $agentCommission,
            'mm_commission' => $mmCommission,
            'active_users' => $activeUsers,
            'avg_cpu' => round($avgCpu ?? 0),
            'total_data_gb' => $totalDataGb,
            'active_subscribers' => $activeSubscribers,
            'expired_today' => $expiredToday,
            'account_credit' => 0, // prepaid balance - extend later
            'balance' => $balance,
            'system_online' => $systemOnline,
            'sales_today' => $salesToday,
            'recent_sales' => $recentSales,
            'subscriber_filters' => $subscriberFilters,
            'daily' => $daily,
        ];
    }

    /**
     * Per-day breakdown for the Overview chart, filterable by channel or a
     * single subscriber - kept separate from dashboard() so switching the
     * filter never invalidates the (cached) KPI cards / recent sales above it.
     */
    public function series(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $tz = Tenant::find($tenantId)?->timezone ?: config('app.timezone');
        $start = $request->input('start', $request->input('start_date')) ?? now($tz)->startOfMonth()->toDateString();
        $end = $request->input('end', $request->input('end_date')) ?? now($tz)->toDateString();
        $channel = $request->input('channel', 'all'); // all | mobile_money | vouchers
        $subscriberId = $request->input('subscriber_id');

        // Same tenant-local-day reasoning as dashboard() - see the comment there.
        $range = [
            Carbon::parse($start, $tz)->startOfDay()->utc()->toDateTimeString(),
            Carbon::parse($end, $tz)->endOfDay()->utc()->toDateTimeString(),
        ];

        $query = Transaction::where('tenant_id', $tenantId)
            ->where('status', 'completed')
            ->whereBetween('paid_at', $range);

        if ($subscriberId) {
            $query->where('subscriber_id', $subscriberId);
        } elseif ($channel === 'mobile_money') {
            $query->whereIn('method', ['mtn_momo', 'airtel_money']);
        } elseif ($channel === 'vouchers') {
            $query->where('type', 'voucher');
        }

        $offset = $this->tzOffset($tz);
        $daily = $query
            ->selectRaw("DATE(CONVERT_TZ(paid_at, '+00:00', '{$offset}')) as date, SUM(net_amount) as net_revenue, SUM(commission) as commission, SUM(amount) as gross_revenue")
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return response()->json(['daily' => $daily]);
    }

    /**
     * Numeric UTC offset (e.g. "+03:00") for a timezone name, suitable for
     * MySQL/MariaDB's CONVERT_TZ. Named zones (CONVERT_TZ(x,'UTC','Africa/..'))
     * would be more correct across DST changes, but silently return NULL unless
     * the server's mysql.time_zone_name tables are loaded - not guaranteed on a
     * fresh MariaDB install. A numeric offset always works; Africa/Kampala (and
     * every timezone HotBill currently serves) has no DST anyway.
     */
    private function tzOffset(string $tz): string
    {
        $seconds = (new \DateTimeZone($tz))->getOffset(new \DateTime('now', new \DateTimeZone('UTC')));

        $sign = $seconds < 0 ? '-' : '+';
        $seconds = abs($seconds);

        return sprintf('%s%02d:%02d', $sign, intdiv($seconds, 3600), intdiv($seconds % 3600, 60));
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
