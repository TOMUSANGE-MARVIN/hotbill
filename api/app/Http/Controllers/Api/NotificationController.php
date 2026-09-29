<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PortalOrder;
use App\Models\Router;
use App\Models\Tenant;
use App\Models\Transaction;
use App\Models\User;
use App\Models\WalletTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * The operator's notification bell. Built from what already happened in the
 * business (sales, failed payments, withdrawals, routers, voucher stock), so
 * nothing extra has to be written when those events occur. Only the "read up
 * to" moment is stored, per user.
 */
class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $tenant = Tenant::findOrFail($user->tenant_id);
        $cur = $tenant->currency ?: 'UGX';
        $money = fn ($v) => $cur . ' ' . number_format((float) $v);
        $since = now()->subDays(7);

        $items = collect();

        $sales = Transaction::where('tenant_id', $tenant->id)
            ->where('status', 'completed')
            ->where('paid_at', '>=', $since)
            ->with(['package:id,name', 'voucher:id,code'])
            ->latest('paid_at')->limit(40)
            ->get(['id', 'type', 'method', 'amount', 'phone', 'package_id', 'voucher_id', 'paid_at']);
        foreach ($sales as $s) {
            $voucher = $s->type === 'voucher';
            $items->push([
                'id' => "sale-{$s->id}",
                'type' => $voucher ? 'voucher_sale' : 'momo_sale',
                'level' => 'success',
                'title' => ($voucher ? 'Voucher used' : 'Mobile Money sale') . ' · ' . $money($s->amount),
                'body' => trim(($s->package?->name ?? 'Package') . ' · ' . ($voucher ? ($s->voucher?->code ?? '') : $this->payer($s->phone, $s->method))),
                'at' => $s->paid_at,
                'href' => '/dashboard/transactions',
            ]);
        }

        $failed = PortalOrder::where('tenant_id', $tenant->id)
            ->where('status', 'failed')
            ->where('created_at', '>=', $since)
            ->with('package:id,name')
            ->latest('id')->limit(20)
            ->get(['id', 'phone', 'provider', 'amount', 'package_id', 'created_at']);
        foreach ($failed as $o) {
            $items->push([
                'id' => "failed-{$o->id}",
                'type' => 'payment_failed',
                'level' => 'warning',
                'title' => 'Mobile Money payment not completed · ' . $money($o->amount),
                'body' => ($o->package?->name ?? 'Package') . ' · ' . $this->payer($o->phone, $o->provider)
                    . ' · cancelled, wrong PIN or not enough balance',
                'at' => $o->created_at,
                'href' => '/dashboard/transactions',
            ]);
        }

        $wallet = WalletTransaction::where('tenant_id', $tenant->id)
            ->whereIn('source', ['withdrawal', 'adjustment'])
            ->where('created_at', '>=', now()->subDays(30))
            ->latest('id')->limit(20)->get();
        foreach ($wallet as $w) {
            if ($w->source === 'withdrawal') {
                $sent = (float) ($w->meta['net_payout'] ?? $w->amount);
                [$title, $level] = match ($w->status) {
                    'completed' => ['Withdrawal sent · ' . $money($sent), 'success'],
                    'failed' => ['Withdrawal failed, money returned · ' . $money($sent), 'danger'],
                    default => ['Withdrawal in progress · ' . $money($sent), 'info'],
                };
                $body = 'To ' . ($w->meta['phone'] ?? $tenant->payout_phone ?? 'your payout number');
            } else {
                $title = ($w->type === 'credit' ? 'Wallet credited · ' : 'Wallet debited · ') . $money($w->amount);
                $level = 'info';
                $body = (string) $w->description;
            }
            $items->push([
                'id' => "wallet-{$w->id}",
                'type' => 'wallet',
                'level' => $level,
                'title' => $title,
                'body' => $body,
                'at' => $w->updated_at,
                'href' => '/dashboard/wallet',
            ]);
        }

        // Routers that have stopped checking in (short blips are ignored).
        $offline = Router::where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->whereNotNull('last_seen_at')
            ->where('last_seen_at', '<', now()->subMinutes(10))
            ->get(['id', 'name', 'last_seen_at']);
        foreach ($offline as $r) {
            $items->push([
                'id' => "router-{$r->id}-" . $r->last_seen_at->timestamp,
                'type' => 'router_offline',
                'level' => 'danger',
                'title' => "{$r->name} is offline",
                'body' => 'Last seen ' . $r->last_seen_at->diffForHumans() . '. Customers cannot buy or connect until it is back. Check its power and internet.',
                'at' => $r->last_seen_at,
                'href' => "/dashboard/routers/{$r->id}",
            ]);
        }

        // Packages that sell through vouchers and are about to run out.
        $stock = DB::table('vouchers')->where('tenant_id', $tenant->id)
            ->selectRaw("package_id, SUM(CASE WHEN status='unused' THEN 1 ELSE 0 END) as unused, MAX(used_at) as last_used")
            ->groupBy('package_id')
            ->havingRaw('MAX(used_at) >= ?', [now()->subDays(14)])
            ->get();
        $names = DB::table('packages')->whereIn('id', $stock->pluck('package_id'))->pluck('name', 'id');
        foreach ($stock as $row) {
            if ((int) $row->unused >= 10) {
                continue;
            }
            $items->push([
                'id' => "stock-{$row->package_id}-{$row->unused}",
                'type' => 'voucher_stock',
                'level' => 'warning',
                'title' => ((int) $row->unused === 0 ? 'Out of vouchers' : "Only {$row->unused} voucher(s) left") . ' · ' . ($names[$row->package_id] ?? 'Package'),
                'body' => 'Generate and print a new batch so sellers do not run out.',
                'at' => Carbon::parse($row->last_used),
                'href' => '/dashboard/vouchers',
            ]);
        }

        $readAt = $user->notifications_read_at;
        $items = $items->sortByDesc(fn ($i) => $i['at']?->timestamp ?? 0)->values()->take(60)
            ->map(fn ($i) => array_merge($i, ['unread' => !$readAt || ($i['at'] && $i['at']->gt($readAt))]));

        return response()->json([
            'items' => $items,
            'unread' => $items->where('unread', true)->count(),
            'read_at' => $readAt,
        ]);
    }

    public function markRead(Request $request): JsonResponse
    {
        // Update by key rather than save(): the business middleware may have
        // swapped tenant_id in memory for this request, and save() would
        // persist that as the user's home business.
        User::whereKey($request->user()->id)->update(['notifications_read_at' => now()]);

        return response()->json(['unread' => 0]);
    }

    private function payer(?string $phone, ?string $network): string
    {
        $net = match (true) {
            str_contains((string) $network, 'mtn') => 'MTN',
            str_contains((string) $network, 'airtel') => 'Airtel',
            default => '',
        };

        return trim(($phone ?: 'Customer') . ($net ? " ({$net})" : ''));
    }
}
