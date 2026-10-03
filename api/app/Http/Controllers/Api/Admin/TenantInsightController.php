<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PortalOrder;
use App\Models\Router;
use App\Models\RouterCommand;
use App\Models\Tenant;
use App\Models\Transaction;
use App\Models\User;
use App\Models\WalletTransaction;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Super-admin view of a single business: everything about how it is doing,
 * plus the levers a platform admin needs to act on it.
 */
class TenantInsightController extends Controller
{
    public function show(Request $request, Tenant $tenant): JsonResponse
    {
        $tz = $tenant->timezone ?: config('app.timezone');
        $offset = $this->tzOffset($tz);
        // A period of calendar days in the business's own timezone. Defaults to
        // this month so figures start fresh each month; `days` is still accepted.
        $toLocal = $request->filled('to') ? Carbon::parse($request->input('to'), $tz) : Carbon::now($tz);
        $fromLocal = match (true) {
            $request->filled('from') => Carbon::parse($request->input('from'), $tz),
            $request->filled('days') => $toLocal->copy()->subDays(max(1, min(366, (int) $request->input('days'))) - 1),
            default => Carbon::now($tz)->startOfMonth(),
        };
        if ($fromLocal->gt($toLocal)) {
            [$fromLocal, $toLocal] = [$toLocal, $fromLocal];
        }
        $fromLocal = $fromLocal->startOfDay();
        $toLocal = $toLocal->endOfDay();
        $days = min(366, (int) $fromLocal->diffInDays($toLocal) + 1);
        $fromLocal = $toLocal->copy()->subDays($days - 1)->startOfDay();

        // Converted to UTC bounds for the stored timestamps.
        $to = $toLocal->copy()->utc();
        $from = $fromLocal->copy()->utc();

        $sales = Transaction::where('transactions.tenant_id', $tenant->id)->where('transactions.status', 'completed');
        $period = (clone $sales)->whereBetween('transactions.paid_at', [$from, $to]);

        $sum = fn ($q) => $q->selectRaw("
                COUNT(*) as count,
                COALESCE(SUM(amount),0) as gross,
                COALESCE(SUM(CASE WHEN type='voucher' THEN amount ELSE 0 END),0) as voucher,
                COALESCE(SUM(CASE WHEN type<>'voucher' THEN amount ELSE 0 END),0) as mobile_money,
                SUM(CASE WHEN type='voucher' THEN 1 ELSE 0 END) as voucher_count,
                SUM(CASE WHEN type<>'voucher' THEN 1 ELSE 0 END) as mobile_money_count,
                COALESCE(SUM(commission),0) as platform_revenue,
                COALESCE(SUM(net_amount),0) as operator_net,
                MAX(paid_at) as last_sale_at
            ")->first();

        $allTime = $sum(clone $sales);
        $inPeriod = $sum(clone $period);

        $withdrawals = WalletTransaction::where('tenant_id', $tenant->id)
            ->where('type', 'debit')->where('source', 'withdrawal');

        // Mobile-money checkout health (portal orders) within the period.
        $orders = PortalOrder::where('tenant_id', $tenant->id)->whereBetween('created_at', [$from, $to])
            ->selectRaw('status, COUNT(*) as c, COALESCE(SUM(amount),0) as amount')
            ->groupBy('status')->get()->keyBy('status');
        $paid = (int) ($orders['paid']->c ?? 0);
        $failed = (int) ($orders['failed']->c ?? 0);
        $pending = (int) ($orders['pending']->c ?? 0);

        // Daily series in the business's local calendar.
        $salesByDay = (clone $period)
            ->selectRaw("DATE(CONVERT_TZ(paid_at, '+00:00', '{$offset}')) as d,
                SUM(amount) as gross,
                SUM(CASE WHEN type='voucher' THEN amount ELSE 0 END) as voucher,
                SUM(CASE WHEN type<>'voucher' THEN amount ELSE 0 END) as mobile_money,
                SUM(commission) as commission,
                COUNT(*) as sales")
            ->groupBy('d')->get()->keyBy('d');
        $dataByDay = DB::table('hotspot_usage_daily')->where('tenant_id', $tenant->id)
            ->whereBetween('date', [$fromLocal->toDateString(), $toLocal->toDateString()])
            ->get(['date', 'bytes', 'sessions'])->keyBy(fn ($r) => substr((string) $r->date, 0, 10));

        $series = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $d = $toLocal->copy()->subDays($i)->toDateString();
            $s = $salesByDay[$d] ?? null;
            $series[] = [
                'date' => $d,
                'gross' => (float) ($s->gross ?? 0),
                'mobile_money' => (float) ($s->mobile_money ?? 0),
                'voucher' => (float) ($s->voucher ?? 0),
                'commission' => (float) ($s->commission ?? 0),
                'sales' => (int) ($s->sales ?? 0),
                'bytes' => (int) ($dataByDay[$d]->bytes ?? 0),
            ];
        }

        // When customers buy - hour of day, local time.
        $byHour = (clone $period)
            ->selectRaw("HOUR(CONVERT_TZ(paid_at, '+00:00', '{$offset}')) as h, COUNT(*) as sales, SUM(amount) as gross")
            ->groupBy('h')->get()->keyBy('h');
        $hourly = collect(range(0, 23))->map(fn ($h) => [
            'hour' => $h,
            'sales' => (int) ($byHour[$h]->sales ?? 0),
            'gross' => (float) ($byHour[$h]->gross ?? 0),
        ]);

        $packages = (clone $period)
            ->leftJoin('packages', 'packages.id', '=', 'transactions.package_id')
            ->selectRaw("transactions.package_id, COALESCE(packages.name, 'Unknown') as name, packages.price,
                COUNT(*) as sales, SUM(transactions.amount) as gross,
                SUM(CASE WHEN transactions.type='voucher' THEN 1 ELSE 0 END) as via_voucher")
            ->groupBy('transactions.package_id', 'packages.name', 'packages.price')
            ->orderByDesc('gross')->get();

        $routers = Router::where('tenant_id', $tenant->id)->orderBy('name')->get()->map(function (Router $r) {
            $cmds = RouterCommand::where('router_id', $r->id)->where('created_at', '>=', now()->subDay())
                ->selectRaw('status, COUNT(*) as c')->groupBy('status')->pluck('c', 'status');
            return [
                'id' => $r->id,
                'name' => $r->name,
                'model' => $r->model,
                'ros_version' => $r->ros_version,
                'online' => $r->isOnline(),
                'last_seen_at' => $r->last_seen_at,
                'cpu_load' => $r->cpu_load,
                'memory_used_pct' => $r->total_memory ? round(100 - ($r->free_memory / $r->total_memory * 100)) : null,
                'uptime' => $r->uptime,
                'active_users' => (int) $r->active_users,
                'is_active' => (bool) $r->is_active,
                'commands_24h' => [
                    'done' => (int) ($cmds['done'] ?? 0),
                    'failed' => (int) ($cmds['failed'] ?? 0),
                    'waiting' => (int) (($cmds['pending'] ?? 0) + ($cmds['sent'] ?? 0)),
                ],
            ];
        });

        $vouchers = DB::table('vouchers')->where('tenant_id', $tenant->id)
            ->selectRaw('status, COUNT(*) as c')->groupBy('status')->pluck('c', 'status');

        $batches = DB::table('voucher_batches')->where('voucher_batches.tenant_id', $tenant->id)
            ->leftJoin('packages', 'packages.id', '=', 'voucher_batches.package_id')
            ->orderByDesc('voucher_batches.created_at')->limit(10)
            ->get(['voucher_batches.id', 'voucher_batches.name', 'voucher_batches.prefix', 'voucher_batches.quantity',
                'voucher_batches.created_at', 'packages.name as package',
                DB::raw("(SELECT COUNT(*) FROM vouchers v WHERE v.batch_id = voucher_batches.id AND v.status <> 'unused') as used_count")]);

        $now = now();
        $subscribers = DB::table('subscribers')->where('tenant_id', $tenant->id)->whereNull('deleted_at')
            ->selectRaw('COUNT(*) as total,
                SUM(CASE WHEN status = ? AND (expires_at IS NULL OR expires_at > ?) THEN 1 ELSE 0 END) as active', ['active', $now])
            ->first();

        $usage = DB::table('hotspot_usage_daily')->where('tenant_id', $tenant->id)
            ->whereBetween('date', [$fromLocal->toDateString(), $toLocal->toDateString()])
            ->selectRaw('COALESCE(SUM(bytes),0) as bytes, COALESCE(SUM(sessions),0) as sessions')->first();

        $uniqueBuyers = (clone $period)->whereNotNull('phone')->distinct('phone')->count('phone');
        $repeatBuyers = (clone $period)->whereNotNull('phone')->where('type', '<>', 'voucher')
            ->select('phone')->groupBy('phone')->havingRaw('COUNT(*) > 1')->get()->count();

        return response()->json([
            'tenant' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'email' => $tenant->email,
                'phone' => $tenant->phone,
                'plan' => $tenant->plan,
                'is_active' => $tenant->is_active,
                'currency' => $tenant->currency ?: 'UGX',
                'timezone' => $tz,
                'payout_phone' => $tenant->payout_phone,
                'payout_provider' => $tenant->payout_provider,
                'wallet_balance' => (float) $tenant->wallet_balance,
                'voucher_commission_enabled' => $tenant->voucher_commission_enabled,
                'voucher_commission_rate' => (float) $tenant->voucher_commission_rate,
                'effective_voucher_commission' => $tenant->voucherCommissionPercent(),
                'trial_ends_at' => $tenant->trial_ends_at,
                'created_at' => $tenant->created_at,
            ],
            'range' => ['days' => $days, 'from' => $fromLocal->toDateString(), 'to' => $toLocal->toDateString()],
            'finance' => [
                'all_time' => $this->money($allTime),
                'period' => $this->money($inPeriod),
                'withdrawn' => (float) (clone $withdrawals)->where('status', 'completed')->sum('amount'),
                'withdrawals_count' => (clone $withdrawals)->where('status', 'completed')->count(),
                'pending_withdrawals' => (float) (clone $withdrawals)->whereIn('status', ['pending', 'processing'])->sum('amount'),
                'last_sale_at' => $allTime->last_sale_at,
            ],
            'payments' => [
                'paid' => $paid,
                'failed' => $failed,
                'pending' => $pending,
                'success_rate' => ($paid + $failed) > 0 ? round($paid / ($paid + $failed) * 100, 1) : null,
                'failed_amount' => (float) ($orders['failed']->amount ?? 0),
            ],
            'customers' => [
                'subscribers_total' => (int) ($subscribers->total ?? 0),
                'subscribers_active' => (int) ($subscribers->active ?? 0),
                'unique_buyers' => $uniqueBuyers,
                'repeat_buyers' => $repeatBuyers,
                'data_bytes' => (int) $usage->bytes,
                'sessions' => (int) $usage->sessions,
            ],
            'vouchers' => [
                'by_status' => $vouchers,
                'batches' => $batches,
            ],
            'agents_count' => DB::table('agents')->where('tenant_id', $tenant->id)->count(),
            'packages' => $packages,
            'routers' => $routers,
            'team' => $this->team($tenant),
            'series' => $series,
            'hourly' => $hourly,
            'recent_sales' => Transaction::where('tenant_id', $tenant->id)->with('package:id,name')->latest('id')->limit(15)
                ->get(['id', 'package_id', 'reference', 'type', 'method', 'amount', 'commission', 'status', 'phone', 'paid_at', 'created_at']),
            'failed_payments' => PortalOrder::where('tenant_id', $tenant->id)->where('status', 'failed')->latest('id')->limit(10)
                ->get(['id', 'phone', 'provider', 'amount', 'merchant_reference', 'created_at']),
            'wallet_ledger' => WalletTransaction::where('tenant_id', $tenant->id)->latest('id')->limit(25)->get(),
            'recent_commands' => RouterCommand::whereIn('router_id', $routers->pluck('id'))->latest('id')->limit(15)
                ->get(['id', 'router_id', 'kind', 'label', 'status', 'result', 'created_at', 'completed_at']),
        ]);
    }

    /**
     * Credit or debit a business's wallet by hand (corrections, goodwill,
     * recovering a mistaken payout). Always leaves a ledger row naming the
     * admin and the reason.
     */
    public function adjustWallet(Request $request, Tenant $tenant): JsonResponse
    {
        $data = $request->validate([
            'type' => 'required|in:credit,debit',
            'amount' => 'required|numeric|min:1|max:100000000',
            'reason' => 'required|string|min:3|max:255',
        ]);

        if ($data['type'] === 'debit' && (float) $data['amount'] > (float) $tenant->fresh()->wallet_balance) {
            return response()->json(['message' => 'The debit is larger than the wallet balance.'], 422);
        }

        $entry = $tenant->postWallet($data['type'], (float) $data['amount'], 'adjustment', [
            'status' => 'completed',
            'reference' => 'ADJ-' . strtoupper(\Illuminate\Support\Str::random(10)),
            'description' => 'Admin adjustment: ' . $data['reason'],
            'meta' => ['admin_id' => $request->user()->id, 'admin_email' => $request->user()->email, 'reason' => $data['reason']],
        ]);

        Log::info('Admin wallet adjustment', ['tenant_id' => $tenant->id, 'admin_id' => $request->user()->id, 'type' => $data['type'], 'amount' => $data['amount']]);

        return response()->json(['message' => 'Wallet adjusted.', 'entry' => $entry, 'balance' => (float) $tenant->fresh()->wallet_balance]);
    }

    public function updateUser(Request $request, User $user): JsonResponse
    {
        abort_if($user->role === 'super_admin', 422, 'Platform admins cannot be changed here.');

        $data = $request->validate(['is_active' => 'required|boolean']);
        $user->update($data);

        // A suspended user must not keep working on an open session.
        if (!$data['is_active']) {
            $user->tokens()->delete();
        }

        return response()->json(['message' => $data['is_active'] ? 'User reactivated.' : 'User suspended and signed out.']);
    }

    public function signOutUser(Request $request, User $user): JsonResponse
    {
        abort_if($user->role === 'super_admin', 422, 'Platform admins cannot be changed here.');

        $count = $user->tokens()->delete();

        return response()->json(['message' => "Signed out of {$count} session(s)."]);
    }

    /**
     * Queue a maintenance action on a router through the poll-based command
     * queue - the router picks it up within ~30s over its own outbound HTTPS.
     */
    public function routerAction(Request $request, Router $router): JsonResponse
    {
        $data = $request->validate(['action' => 'required|in:refresh-login,reboot']);

        $script = match ($data['action']) {
            'refresh-login' => '/tool fetch url="' . rtrim(config('app.url'), '/') . '/api/v1/portal/routers/' . $router->id
                . '/login.html" dst-path=hotspot/login.html mode=https',
            // Delay so the router can report the command as done before it goes down.
            'reboot' => ':delay 5s; /system reboot',
        };

        $command = RouterCommand::create([
            'router_id' => $router->id,
            'kind' => $data['action'] === 'reboot' ? 'admin-reboot' : 'refresh-login',
            'label' => ($data['action'] === 'reboot' ? 'Reboot' : 'Refresh captive portal page') . ' (platform admin)',
            'script' => $script,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => $router->isOnline()
                ? 'Queued - the router will run it within about 30 seconds.'
                : 'Queued - the router is offline and will run it when it reconnects.',
            'command_id' => $command->id,
        ]);
    }

    private function team(Tenant $tenant): array
    {
        $users = User::where('tenant_id', $tenant->id)
            ->orWhereHas('tenants', fn ($q) => $q->where('tenants.id', $tenant->id))
            ->get(['id', 'name', 'email', 'phone', 'role', 'is_active', 'email_verified_at', 'created_at', 'tenant_id']);

        $lastUsed = DB::table('personal_access_tokens')
            ->where('tokenable_type', User::class)
            ->whereIn('tokenable_id', $users->pluck('id'))
            ->selectRaw('tokenable_id, MAX(last_used_at) as last_used_at, COUNT(*) as sessions')
            ->groupBy('tokenable_id')->get()->keyBy('tokenable_id');

        return $users->map(fn (User $u) => [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'phone' => $u->phone,
            'role' => $u->role,
            'is_active' => (bool) $u->is_active,
            'verified' => $u->email_verified_at !== null,
            'owner' => (int) $u->tenant_id === $tenant->id,
            'last_active_at' => $lastUsed[$u->id]->last_used_at ?? null,
            'sessions' => (int) ($lastUsed[$u->id]->sessions ?? 0),
            'created_at' => $u->created_at,
        ])->values()->all();
    }

    private function money(object $row): array
    {
        return [
            'sales' => (int) $row->count,
            'gross' => (float) $row->gross,
            'mobile_money' => (float) $row->mobile_money,
            'mobile_money_count' => (int) $row->mobile_money_count,
            'voucher' => (float) $row->voucher,
            'voucher_count' => (int) $row->voucher_count,
            'platform_revenue' => (float) $row->platform_revenue,
            'operator_net' => (float) $row->operator_net,
        ];
    }

    private function tzOffset(string $tz): string
    {
        $seconds = (new \DateTimeZone($tz))->getOffset(new \DateTime('now', new \DateTimeZone('UTC')));
        $sign = $seconds < 0 ? '-' : '+';
        $seconds = abs($seconds);

        return sprintf('%s%02d:%02d', $sign, intdiv($seconds, 3600), intdiv($seconds % 3600, 60));
    }
}
