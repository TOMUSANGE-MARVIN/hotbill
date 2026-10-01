<?php

namespace App\Console\Commands;

use App\Models\PlatformWithdrawal;
use App\Models\WalletTransaction;
use App\Services\PlatformWalletService;
use App\Services\PayoutService;
use Illuminate\Console\Command;

/**
 * Self-heals withdrawals stuck in 'processing'.
 *
 * A payout is marked 'processing' as soon as MarzPay accepts the send-money
 * request; the disbursement webhook is supposed to settle it to completed/failed.
 * If that webhook is never delivered (or can't be matched), the withdrawal would
 * otherwise stay 'processing' forever even though the money already moved. This
 * command re-verifies each such withdrawal against MarzPay via its stored
 * send-money uuid and settles it - the same logic the webhook runs, so it's the
 * safety net for missed webhooks.
 *
 * We give the webhook a short head start (only reconcile rows older than a couple
 * of minutes) to avoid racing a webhook that's about to arrive.
 */
class ReconcilePayouts extends Command
{
    protected $signature = 'payouts:reconcile {--minutes=2 : Only reconcile withdrawals older than this many minutes}';
    protected $description = 'Re-verify processing withdrawals against MarzPay and settle any the webhook missed';

    public function handle(PayoutService $payouts, PlatformWalletService $platformWallet): int
    {
        $cutoff = now()->subMinutes((int) $this->option('minutes'));

        $stuck = WalletTransaction::query()
            ->where('source', 'withdrawal')
            ->where('type', 'debit')
            ->where('status', 'processing')
            ->whereNotNull('meta->marzpay_uuid')
            ->where('created_at', '<=', $cutoff)
            ->get();

        $settled = 0;
        foreach ($stuck as $withdrawal) {
            $result = $payouts->reconcile($withdrawal);
            if ($result !== null) {
                $settled++;
                $this->line("Withdrawal #{$withdrawal->id} → {$result}");
            }
        }

        $this->info("Checked {$stuck->count()} processing withdrawal(s), settled {$settled}.");

        // The platform's own withdrawals go through the same MarzPay send-money.
        $platform = PlatformWithdrawal::where('status', 'processing')->whereNotNull('marzpay_uuid')
            ->where('created_at', '<=', $cutoff)->get();
        foreach ($platform as $w) {
            if ($result = $platformWallet->reconcile($w)) {
                $this->line("Platform withdrawal #{$w->id} → {$result}");
            }
        }

        return self::SUCCESS;
    }
}
