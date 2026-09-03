<?php

namespace App\Console\Commands;

use App\Http\Controllers\Api\PortalController;
use App\Models\PortalOrder;
use Illuminate\Console\Command;

/**
 * fulfill() atomically claims an order to 'fulfilling' before doing any real
 * work, specifically so the webhook and the status-poll can't both process
 * the same payment. But nothing ever un-stuck an order if whatever caused the
 * interruption (an exception, a killed request) happened before fulfill()
 * reached its own final status update - the claim was a one-way door with no
 * recovery path. Found this the hard way: an order sat in 'fulfilling'
 * indefinitely (a real customer, already charged, stuck on "Check your
 * phone" forever) because a cross-tenant subscribers.username collision threw
 * mid-fulfill(). That specific bug is fixed, but this is the general safety
 * net so no future interruption can strand a paying customer the same way.
 */
class RetryStuckFulfillment extends Command
{
    protected $signature = 'orders:retry-stuck-fulfillment';
    protected $description = 'Recover paid orders stuck in fulfilling because fulfill() was interrupted mid-flight';

    public function handle(PortalController $portal): int
    {
        // Give a normal in-progress fulfill() call (provisioning alone can take
        // up to ~70s) a wide margin before treating it as abandoned.
        $stuck = PortalOrder::where('status', 'fulfilling')
            ->where('updated_at', '<', now()->subMinutes(3))
            ->get();

        $recovered = 0;
        foreach ($stuck as $order) {
            // Reset to 'pending' so fulfill()'s own atomic claim can retry
            // cleanly - safe because fulfill() never re-charges the customer,
            // it only (re)creates the subscriber/hotspot account and records
            // the sale once, guarded by its own idempotent status checks.
            $claimed = PortalOrder::whereKey($order->id)->where('status', 'fulfilling')->update(['status' => 'pending']);
            if (!$claimed) {
                continue;
            }

            $order->refresh();
            $portal->fulfill($order, $order->payment_method);
            $order->refresh();

            if (in_array($order->status, ['paid', 'provisioning_failed'], true)) {
                $recovered++;
                $this->line("Order #{$order->id} -> {$order->status}");
            }
        }

        $this->info("Checked {$stuck->count()} stuck fulfilling order(s), recovered {$recovered}.");

        return self::SUCCESS;
    }
}
