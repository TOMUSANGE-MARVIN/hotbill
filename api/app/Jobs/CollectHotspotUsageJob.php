<?php

namespace App\Jobs;

use App\Models\Router;
use App\Services\HotspotUsageRecorder;
use App\Services\MikrotikService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Polls a router's hotspot for per-user usage over the direct API — only
 * works when the router's VPN tunnel is actually reachable, which most
 * NAT/CGNAT routers' isn't (see RouterController::usageReport for the
 * NAT-safe push path those routers use instead). Kept as a fallback for
 * routers where the tunnel does work. Dispatched from the 60s heartbeat so
 * it rides the existing queue worker — no separate scheduler needed.
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

        HotspotUsageRecorder::record($router, $snapshot);
    }
}
