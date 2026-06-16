<?php

namespace App\Services;

use App\Models\Tenant;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\Log;

/**
 * Sends operator withdrawals out to their mobile-money number.
 *
 * Auto-disbursement (PesaPal Payouts / MTN / Airtel) is a separate product that
 * must be enabled on the platform account and funded with a float. Until that's
 * live (config hotbill.platform.payouts_enabled = false), this records the
 * intent and leaves the withdrawal in 'processing' for manual release — no money
 * is ever silently lost, and the ledger debit already reserved the balance.
 */
class PayoutService
{
    public function isEnabled(): bool
    {
        return (bool) config('hotbill.platform.payouts_enabled');
    }

    /**
     * Attempt to disburse a pending withdrawal. Returns the resulting status:
     * 'completed', 'processing', or 'failed'.
     */
    public function send(Tenant $tenant, WalletTransaction $withdrawal): string
    {
        if (!$this->isEnabled()) {
            Log::info('Payout queued (disbursement API not enabled)', [
                'tenant_id' => $tenant->id,
                'withdrawal_id' => $withdrawal->id,
                'amount' => $withdrawal->amount,
                'phone' => $tenant->payout_phone,
            ]);
            return 'processing';
        }

        // TODO: integrate PesaPal Payouts / MTN MoMo / Airtel disbursement here.
        // On success return 'completed'; on a hard failure return 'failed' (caller
        // refunds the wallet). Left unimplemented until the provider is enabled.
        Log::warning('Payout disbursement enabled but no provider wired', [
            'withdrawal_id' => $withdrawal->id,
        ]);
        return 'processing';
    }
}
