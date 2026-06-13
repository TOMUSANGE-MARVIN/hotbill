<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Router;
use App\Models\Subscriber;
use App\Models\Transaction;
use App\Models\SubscriberSession;
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

    public function usageAnalytics(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        // Top users by data
        $topUsers = Subscriber::where('tenant_id', $tenantId)
            ->where('data_used_mb', '>', 0)
            ->with('package:id,name')
            ->orderByDesc('data_used_mb')
            ->limit(20)
            ->get(['id', 'username', 'full_name', 'data_used_mb', 'data_limit_mb', 'package_id']);

        // Data per router
        $routerUsage = Router::where('tenant_id', $tenantId)
            ->get(['id', 'name', 'data_rx', 'data_tx', 'active_users', 'status']);

        // Sessions over time (last 7 days)
        $sessionTrend = SubscriberSession::where('tenant_id', $tenantId)
            ->where('started_at', '>=', now()->subDays(7))
            ->selectRaw('DATE(started_at) as date, COUNT(*) as sessions, SUM(bytes_in + bytes_out) as bytes')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return response()->json([
            'top_users' => $topUsers,
            'router_usage' => $routerUsage,
            'session_trend' => $sessionTrend,
        ]);
    }
}
