<?php

namespace App\Console\Commands;

use App\Http\Controllers\Api\PortalController;
use App\Models\Voucher;
use Illuminate\Console\Command;

/**
 * Submitting the hotspot login form navigates the customer's browser away
 * from our portal page, so their own polling (redeemStatus) may never run
 * again after the very first request - this is what actually guarantees a
 * 'connecting' voucher resolves to confirmed-active or genuinely-failed
 * within ~180s, regardless of whether anyone's still watching the page.
 */
class ConfirmVoucherConnections extends Command
{
    protected $signature = 'vouchers:confirm-connections';
    protected $description = 'Confirm or give up on vouchers stuck waiting for a device connection';

    public function handle(PortalController $portal): int
    {
        $pending = Voucher::where('status', 'connecting')->get();

        $confirmed = 0;
        foreach ($pending as $voucher) {
            $result = $portal->resolveVoucherConnection($voucher);
            if ($result['status'] === 'connected') {
                $confirmed++;
            }
        }

        $this->info("Checked {$pending->count()} connecting voucher(s), confirmed {$confirmed}.");

        return self::SUCCESS;
    }
}
