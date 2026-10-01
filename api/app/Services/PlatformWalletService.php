<?php

namespace App\Services;

use App\Models\PlatformWithdrawal;
use App\Models\PortalOrder;
use App\Models\Tenant;
use App\Models\User;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * The platform's own wallet. All customer money lands in one MarzPay account,
 * so part of that balance belongs to operators (their wallets, plus withdrawals
 * still on the way out) and the rest is HotBill's earnings. The platform may
 * only ever withdraw the smaller of:
 *   - what it has earned and not yet withdrawn (the books), and
 *   - the MarzPay cash left after every operator's money is set aside.
 * so a platform withdrawal can never spend money that is owed to an operator.
 */
class PlatformWalletService
{
    public function __construct(private MarzPayService $marzpay) {}

    public function summary(): array
    {
        $hotspotFees = (float) PortalOrder::where('status', 'paid')->sum('platform_fee');
        $voucherCommission = (float) WalletTransaction::where('source', 'voucher_commission')
            ->where('type', 'debit')->where('status', 'completed')->sum('amount');
        $earned = round($hotspotFees + $voucherCommission, 2);

        $withdrawn = PlatformWithdrawal::where('status', 'completed')->selectRaw('COALESCE(SUM(amount + fee),0) as t')->value('t');
        $inFlight = PlatformWithdrawal::where('status', 'processing')->selectRaw('COALESCE(SUM(amount + fee),0) as t')->value('t');
        $bookAvailable = round($earned - (float) $withdrawn - (float) $inFlight, 2);

        $operatorWallets = (float) Tenant::sum('wallet_balance');
        // Already taken from operator wallets but possibly not yet sent by MarzPay.
        $operatorPending = (float) WalletTransaction::where('source', 'withdrawal')->where('type', 'debit')
            ->whereIn('status', ['pending', 'processing'])->sum('amount');
        $owedToOperators = round($operatorWallets + $operatorPending, 2);

        $cash = null;
        try {
            $cash = $this->marzpay->isConfigured() ? $this->marzpay->availableBalance() : null;
        } catch (\Throwable $e) {
            Log::warning('MarzPay balance check failed', ['error' => $e->getMessage()]);
        }

        // Cash that is not owed to anyone. In-flight platform withdrawals are
        // reserved too, in case MarzPay has not deducted them yet (conservative).
        $cashAvailable = $cash === null ? null : round($cash - $owedToOperators - (float) $inFlight, 2);
        $withdrawable = $cashAvailable === null ? 0.0 : max(0.0, min($bookAvailable, $cashAvailable));

        return [
            'currency' => config('hotbill.marzpay.currency', 'UGX'),
            'marzpay_balance' => $cash,
            'owed_to_operators' => $owedToOperators,
            'operator_wallets' => $operatorWallets,
            'operator_withdrawals_pending' => $operatorPending,
            'earned' => [
                'total' => $earned,
                'hotspot_fees' => $hotspotFees,
                'voucher_commission' => $voucherCommission,
            ],
            'withdrawn' => (float) $withdrawn,
            'in_flight' => (float) $inFlight,
            'book_available' => $bookAvailable,
            'cash_available' => $cashAvailable,
            // Cash beyond what operators are owed and what the books say we earned -
            // fee rounding, manual top-ups. Shown, never withdrawable on its own.
            'unexplained' => $cashAvailable === null ? null : round($cashAvailable - $bookAvailable, 2),
            'withdrawable' => round($withdrawable, 2),
            'min_withdrawal' => (float) config('hotbill.platform.min_withdrawal', 1000),
        ];
    }

    /**
     * The largest amount that can be SENT such that amount + fee fits within
     * what is withdrawable.
     */
    public function maxSendable(float $withdrawable): float
    {
        $max = floor($withdrawable);
        while ($max > 0 && $max + MarzPayService::disbursementFee($max) > $withdrawable) {
            $max -= max(1, floor($max * 0.005));
        }

        return max(0.0, $max);
    }

    /**
     * Send platform earnings to a mobile-money number. Serialised with a lock
     * so two clicks (or two admins) can never both spend the same balance.
     */
    public function withdraw(User $admin, float $amount, string $phone, ?string $note = null): PlatformWithdrawal
    {
        return Cache::lock('platform-wallet-withdraw', 60)->block(10, function () use ($admin, $amount, $phone, $note) {
            $summary = $this->summary();

            if ($summary['marzpay_balance'] === null) {
                throw new \RuntimeException('Could not read the MarzPay balance right now, so nothing was sent. Try again in a minute.');
            }

            $fee = MarzPayService::disbursementFee($amount);
            if ($amount + $fee > $summary['withdrawable']) {
                throw new \RuntimeException('That is more than the platform can withdraw. The most you can send now is '
                    . number_format($this->maxSendable($summary['withdrawable'])) . ' (plus the MarzPay fee).');
            }

            $withdrawal = PlatformWithdrawal::create([
                'user_id' => $admin->id,
                'amount' => $amount,
                'fee' => $fee,
                'phone' => MarzPayService::normalizePhone($phone),
                'reference' => (string) Str::uuid(),
                'status' => 'processing',
                'note' => $note,
            ]);

            try {
                $result = $this->marzpay->sendMoney(
                    (int) round($amount),
                    $withdrawal->phone,
                    $withdrawal->reference,
                    'HotBill platform withdrawal',
                    rtrim(config('app.url'), '/') . '/api/v1/portal/marzpay/payout-webhook',
                );
                $withdrawal->update(['marzpay_uuid' => $result['transaction']['uuid'] ?? null]);
            } catch (\Throwable $e) {
                $withdrawal->update(['status' => 'failed', 'error' => $e->getMessage()]);
                Log::error('Platform withdrawal failed to send', ['id' => $withdrawal->id, 'error' => $e->getMessage()]);
            }

            Log::info('Platform withdrawal requested', [
                'id' => $withdrawal->id, 'admin_id' => $admin->id, 'amount' => $amount, 'status' => $withdrawal->status,
            ]);

            return $withdrawal;
        });
    }

    /**
     * Settle a processing platform withdrawal from MarzPay's own record of it.
     * Used by the payout webhook and the scheduled reconciler. Idempotent.
     */
    public function reconcile(PlatformWithdrawal $w, string $hint = ''): ?string
    {
        if ($w->status !== 'processing') {
            return null;
        }

        $status = $hint;
        if ($w->marzpay_uuid) {
            try {
                $details = $this->marzpay->getSendMoneyDetails($w->marzpay_uuid);
                $txn = $details['data']['transaction'] ?? $details['transaction'] ?? [];
                if (!empty($txn['status'])) {
                    $status = strtolower($txn['status']);
                }
            } catch (\Throwable $e) {
                return null; // try again on the next run
            }
        }

        $to = match (true) {
            in_array($status, ['completed', 'successful', 'success'], true) => 'completed',
            in_array($status, ['failed', 'declined', 'cancelled', 'reversed'], true) => 'failed',
            default => null,
        };
        if (!$to) {
            return null;
        }

        $won = PlatformWithdrawal::whereKey($w->id)->where('status', 'processing')
            ->update(['status' => $to, 'completed_at' => now()]) === 1;

        if ($won) {
            Log::info("Platform withdrawal {$to}", ['id' => $w->id]);
        }

        return $won ? $to : null;
    }

    public function findByReference(string $ref): ?PlatformWithdrawal
    {
        return PlatformWithdrawal::where('reference', $ref)->orWhere('marzpay_uuid', $ref)->first();
    }
}
