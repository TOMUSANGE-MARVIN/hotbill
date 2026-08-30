<?php

namespace App\Services;

use App\Models\HotspotUsage;
use App\Models\HotspotUsageDaily;
use App\Models\PortalOrder;
use App\Models\Router;
use App\Models\Voucher;

/**
 * Turns a hotspot usage snapshot (however it was gathered — a direct API
 * poll, or the router self-reporting over the NAT-safe push channel) into
 * HotspotUsage/HotspotUsageDaily rows. Shared so both collection paths stay
 * byte-for-byte consistent.
 */
class HotspotUsageRecorder
{
    /**
     * @param array<int, array{username: string, bytes_in: int, bytes_out: int, uptime_seconds: int, active: bool}> $snapshot
     */
    public static function record(Router $router, array $snapshot): void
    {
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
                [$phone, $packageId] = self::resolveCustomer($router, $row['username']);
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
    private static function resolveCustomer(Router $router, string $username): array
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
