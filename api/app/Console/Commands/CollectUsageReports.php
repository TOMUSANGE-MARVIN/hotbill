<?php

namespace App\Console\Commands;

use App\Models\Router;
use App\Models\RouterCommand;
use Illuminate\Console\Command;

/**
 * Queues a usage-report command for every online router, every 5 minutes.
 * Replaces a router-side `hotbill-usage` scheduler that turned out to fail
 * silently on this multi-step script - the identical script delivered
 * through the existing poll/command queue works reliably, so the server
 * drives it the same way it drives hotspot-user provisioning and disconnects.
 */
class CollectUsageReports extends Command
{
    protected $signature = 'usage:collect';
    protected $description = 'Queue a usage-report command for every online router';

    public function handle(): int
    {
        $routers = Router::whereNotNull('token')->get()->filter(fn (Router $r) => $r->isOnline());

        $queued = 0;
        foreach ($routers as $router) {
            RouterCommand::create([
                'router_id' => $router->id,
                'kind' => 'usage-report',
                'label' => 'Collect hotspot usage',
                'script' => $router->usage_report_script,
                'status' => 'pending',
            ]);
            $queued++;
        }

        $this->info("Queued usage-report for {$queued} online router(s).");

        return self::SUCCESS;
    }
}
