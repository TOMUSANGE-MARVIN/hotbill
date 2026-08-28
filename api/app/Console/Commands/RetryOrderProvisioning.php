<?php

namespace App\Console\Commands;

use App\Http\Controllers\Api\PortalController;
use App\Models\PortalOrder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Self-heals paid orders that were charged but whose hotspot user was never
 * confirmed on the router (see PortalController::fulfill — 'provisioning_failed').
 * The customer's money was already collected; this just keeps retrying the same
 * stored credentials against the router until it confirms, then flips the order
 * to 'paid' so /status starts returning the credentials.
 */
class RetryOrderProvisioning extends Command
{
    protected $signature = 'orders:retry-provisioning';
    protected $description = 'Retry hotspot provisioning for paid orders the router never confirmed';

    public function handle(PortalController $portal): int
    {
        $stuck = PortalOrder::where('status', 'provisioning_failed')->get();

        $fixed = 0;
        foreach ($stuck as $order) {
            $router = $order->router;
            $package = $order->package;
            if (!$router || !$package || !$order->hotspot_username || !$order->hotspot_password) {
                continue;
            }

            $result = $portal->provisionHotspotSession($router, $order->hotspot_username, $order->hotspot_password, $package, 1);

            if ($result === 'done') {
                $order->update(['status' => 'paid']);
                $fixed++;
                $this->line("Order #{$order->id} → paid");
            } else {
                Log::warning('Retry provisioning still failing', ['order' => $order->id, 'result' => $result]);
            }
        }

        $this->info("Checked {$stuck->count()} stuck order(s), fixed {$fixed}.");

        return self::SUCCESS;
    }
}
