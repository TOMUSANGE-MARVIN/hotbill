<?php

namespace App\Jobs;

use App\Models\HotspotUsage;
use App\Models\HotspotUsageDaily;
use App\Models\PortalOrder;
use App\Models\Router;
use App\Models\Voucher;
use App\Services\MikrotikService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Polls a router's hotspot for per-user usage and records it as real,
 * accurate analytics data. Dispatched from the 60s heartbeat so it rides
 * the existing queue worker — no separate scheduler needed.
 */
class CollectHotspotUsageJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 30;
    public int $tries = 1;

    public function __construct(public int $routerId) {}

    public function handle(): void
    {
        $router = Router::find($this->routerId);
        if (!$router) return;

        try {
            $mikrotik = MikrotikService::connect_to($router);
            $snapshot = $mikrotik->getHotspotUsageSnapshot();
            $mikrotik->disconnect();
        } catch (\Throwable $e) {
            Log::info('Hotspot usage poll skipped', ['router' => $router->id, 'error' => $e->getMessage()]);
            return;
        }

        $today = now()->toDateString();
        $deltaBytes = 0;
        $newSessions = 0;

        foreach ($snapshot as $row) {
            $usage = HotspotUsage::firstOrNew([
                'router_id' => $router->id,
                'username' => $row['username'],
            ]);

            // First time we see this user: resolve who they are + their package.
            if (!$usage->exists) {
                $usage->tenant_id = $router->tenant_id;
                $usage->first_seen_at = now();
                [$phone, $packageId] = $this->resolveCustomer($router, $row['username']);
                $usage->phone = $phone;
                $usage->package_id = $packageId;
                $usage->bytes_in = 0;
                $usage->bytes_out = 0;
            }

            $prevTotal = (int) $usage->bytes_in + (int) $usage->bytes_out;
            $newTotal = $row['bytes_in'] + $row['bytes_out'];
            // Counter reset (user re-created on re-purchase) → count the new total.
            $delta = $newTotal >= $prevTotal ? $newTotal - $prevTotal : $newTotal;
            $deltaBytes += $delta;

            // New session when a user transitions offline→online.
            if ($row['active'] && !$usage->active) {
                $usage->sessions = (int) $usage->sessions + 1;
                $newSessions++;
            }

            $usage->bytes_in = $row['bytes_in'];
            $usage->bytes_out = $row['bytes_out'];
            $usage->uptime_seconds = $row['uptime_seconds'];
            $usage->active = $row['active'];
            $usage->last_seen_at = now();
            $usage->save();
        }

        if ($deltaBytes > 0 || $newSessions > 0) {
            $daily = HotspotUsageDaily::firstOrNew(['tenant_id' => $router->tenant_id, 'date' => $today]);
            $daily->bytes = (int) $daily->bytes + $deltaBytes;
            $daily->sessions = (int) $daily->sessions + $newSessions;
            $daily->save();
        }
    }

    /** Map a hotspot username back to the paying customer (phone) + package. */
    private function resolveCustomer(Router $router, string $username): array
    {
        $order = PortalOrder::where('router_id', $router->id)
            ->where('hotspot_username', $username)
            ->latest()
            ->first();
        if ($order) return [$order->phone, $order->package_id];

        $voucher = Voucher::where('used_by_username', $username)
            ->where('tenant_id', $router->tenant_id)
            ->latest()
            ->first();
        if ($voucher) return [null, $voucher->package_id];

        return [null, null];
    }
}
