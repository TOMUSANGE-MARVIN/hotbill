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
 * admin withdrawals queue - the ledger debit already reserved the balance, so no
 * money is ever silently lost.
 */
class PayoutService
{
    public function __construct(private MarzPayService $marzpay) {}

    public function isEnabled(): bool
    {
        return (bool) config('hotbill.marzpay.payouts_enabled')
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
            // The operator bears MarzPay's withdrawal fee - send the net amount.
            $net = (float) ($withdrawal->meta['net_payout'] ?? $withdrawal->amount);

            $result = $this->marzpay->sendMoney(
                (int) round($net),
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
     *
     * MarzPay's payout webhook carries its own `transaction.reference` and echoes
     * OUR reference back as `provider_reference`, so we look the withdrawal up by
     * either field (plus the stored marzpay_uuid) rather than assuming which one
     * the webhook uses.
     */
    public function handleDisbursementWebhook(array $payload): void
    {
        $event = (string) ($payload['event_type'] ?? '');
        $txn = $payload['transaction'] ?? [];

        if (!str_starts_with($event, 'disbursement.')) {
            return;
        }

        $candidates = array_filter([
            $txn['provider_reference'] ?? null, // our reference, echoed back
            $txn['reference'] ?? null,          // MarzPay's own reference
            $txn['uuid'] ?? null,               // the send-money uuid we stored
        ]);

        $withdrawal = null;
        foreach ($candidates as $ref) {
            $withdrawal = WalletTransaction::where('source', 'withdrawal')
                ->where('type', 'debit')
                ->where(function ($q) use ($ref) {
                    $q->where('reference', $ref)
                      ->orWhere('meta->marzpay_uuid', $ref);
                })
                ->first();
            if ($withdrawal) {
                break;
            }
        }

        if (!$withdrawal) {
            return; // unknown transaction
        }

        // Prefer the authoritative MarzPay status (re-verified) over the webhook body.
        $this->reconcile($withdrawal, strtolower($txn['status'] ?? ''));
    }

    /**
     * Settle a single 'processing'/'pending' withdrawal by re-checking its real
     * status at MarzPay (via the stored send-money uuid). Completes it, or refunds
     * the reserved balance if the payout failed/reversed. Idempotent and safe to
     * call from the webhook, the scheduled reconciler, or the admin queue.
     *
     * Returns the resulting status, or null if nothing was done.
     *
     * @param  string  $hint  optional status already known (e.g. from a webhook body)
     */
    public function reconcile(WalletTransaction $withdrawal, string $hint = ''): ?string
    {
        if (in_array($withdrawal->status, ['completed', 'failed'], true)) {
            return null; // already settled
        }

        $status = $hint;
        $uuid = $withdrawal->meta['marzpay_uuid'] ?? null;

        // Re-verify against MarzPay rather than trusting any webhook body.
        if ($uuid) {
            try {
                $details = $this->marzpay->getSendMoneyDetails($uuid);
                $txn = $details['data']['transaction'] ?? $details['transaction'] ?? [];
                if (!empty($txn['status'])) {
                    $status = strtolower($txn['status']);
                }
            } catch (\Throwable $e) {
                Log::warning('Payout reconcile: MarzPay verify failed', [
                    'withdrawal_id' => $withdrawal->id,
                    'error' => $e->getMessage(),
                ]);
                return null; // leave it processing; try again next run
            }
        }

        if (in_array($status, ['completed', 'successful', 'success'], true)) {
            $withdrawal->update(['status' => 'completed']);
            Log::info('Payout reconciled to completed', ['withdrawal_id' => $withdrawal->id]);
            return 'completed';
        }

        if (in_array($status, ['failed', 'declined', 'cancelled', 'reversed'], true)) {
            // Refund the reserved amount back to the operator wallet.
            $withdrawal->tenant?->postWallet('credit', (float) $withdrawal->amount, 'adjustment', [
                'status' => 'completed',
                'reference' => $withdrawal->reference,
                'description' => 'Refund: payout failed',
            ]);
            $withdrawal->update(['status' => 'failed']);
            Log::info('Payout reconciled to failed (refunded)', ['withdrawal_id' => $withdrawal->id]);
            return 'failed';
        }

        return null; // still pending/processing at MarzPay - leave as is
    }
}
