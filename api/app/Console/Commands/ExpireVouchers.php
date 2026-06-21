<?php

namespace App\Console\Commands;

use App\Models\Voucher;
use Illuminate\Console\Command;

/**
 * Settles voucher expiry across all tenants in one indexed bulk update.
 * Runs on the scheduler so the lazy per-request backfill in VoucherController
 * almost never has work to do.
 */
class ExpireVouchers extends Command
{
    protected $signature = 'vouchers:expire';
    protected $description = 'Mark active vouchers whose validity window has passed as expired';

    public function handle(): int
    {
        $count = Voucher::query()
            ->where('status', 'active')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->update(['status' => 'expired']);

        $this->info("Expired {$count} voucher(s).");

        return self::SUCCESS;
    }
}
