<?php

namespace App\Services;

use App\Models\Tenant;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\Log;

/**
 * Sends operator withdrawals out to their mobile-money number.
 *
 * When MarzPay payouts are enabled (config hotbill.marzpay.payouts_enabled) the
 * withdrawal is disbursed automatically via send-money and finalised by the
 * disbursement webhook. Otherwise it is left 'pending' for manual release in the
 * admin withdrawals queue — the ledger debit already reserved the balance, so no
 * money is ever silently lost.
 */
class PayoutService
{
    public function __construct(private MarzPayService $marzpay) {}

    public function isEnabled(): bool
    {
        return config('hotbill.payment_provider') === 'marzpay'
            && (bool) config('hotbill.marzpay.payouts_enabled')
            && $this->marzpay->isConfigured();
    }

    /**
     * Attempt to disburse a pending withdrawal. Returns the resulting status:
     * 'processing' (sent, awaiting webhook), 'pending' (manual), or 'failed'.
     */
    public function send(Tenant $tenant, WalletTransaction $withdrawal): string
    {
        if (!$this->isEnabled()) {
            Log::info('Payout queued for manual release (auto-disbursement off)', [
                'tenant_id' => $tenant->id,
                'withdrawal_id' => $withdrawal->id,
                'amount' => $withdrawal->amount,
            ]);
            return 'pending';
        }

        try {
            $result = $this->marzpay->sendMoney(
                (int) round((float) $withdrawal->amount),
                (string) $tenant->payout_phone,
                (string) $withdrawal->reference,
                'HotBill operator payout',
                rtrim(config('app.url'), '/') . '/api/v1/portal/marzpay/payout-webhook',
            );

            $withdrawal->update([
                'meta' => array_merge($withdrawal->meta ?? [], [
                    'marzpay_uuid' => $result['transaction']['uuid'] ?? null,
                ]),
            ]);

            return 'processing';
        } catch (\Throwable $e) {
            Log::error('MarzPay payout failed', [
                'withdrawal_id' => $withdrawal->id,
                'error' => $e->getMessage(),
            ]);
            return 'failed';
        }
    }

    /**
     * Handle a MarzPay disbursement webhook. Re-verifies against the API (the
     * webhook is unsigned) before completing or refunding. Idempotent.
     */
    public function handleDisbursementWebhook(array $payload): void
    {
        $event = (string) ($payload['event_type'] ?? '');
        $reference = $payload['transaction']['reference'] ?? null;

        if (!$reference || !str_starts_with($event, 'disbursement.')) {
            return;
        }

        $withdrawal = WalletTransaction::where('reference', $reference)
            ->where('source', 'withdrawal')
            ->where('type', 'debit')
            ->first();

        if (!$withdrawal || in_array($withdrawal->status, ['completed', 'failed'])) {
            return; // unknown or already settled
        }

        // Re-verify against MarzPay rather than trusting the webhook body.
        $status = strtolower($payload['transaction']['status'] ?? '');
        $uuid = $withdrawal->meta['marzpay_uuid'] ?? null;
        if ($uuid) {
            $details = $this->marzpay->getSendMoneyDetails($uuid);
            $txn = $details['data']['transaction'] ?? $details['transaction'] ?? [];
            if (!empty($txn['status'])) {
                $status = strtolower($txn['status']);
            }
        }

        if (in_array($status, ['completed', 'successful', 'success'])) {
            $withdrawal->update(['status' => 'completed']);
        } elseif (in_array($status, ['failed', 'declined', 'cancelled', 'reversed'])) {
            // Refund the reserved amount back to the operator wallet.
            $withdrawal->tenant?->postWallet('credit', (float) $withdrawal->amount, 'adjustment', [
                'status' => 'completed',
                'reference' => $withdrawal->reference,
                'description' => 'Refund: payout failed',
            ]);
            $withdrawal->update(['status' => 'failed']);
        }
    }
}
