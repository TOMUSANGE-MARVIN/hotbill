<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Services\PayoutService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WalletController extends Controller
{
    public function __construct(private PayoutService $payouts) {}

    public function index(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);

        $transactions = $tenant->walletTransactions()
            ->latest()
            ->limit(100)
            ->get();

        return response()->json([
            'balance' => (float) $tenant->wallet_balance,
            'currency' => $tenant->currency,
            'payout_phone' => $tenant->payout_phone,
            'payout_provider' => $tenant->payout_provider,
            'min_withdrawal' => (float) config('hotbill.platform.min_withdrawal'),
            'payouts_enabled' => $this->payouts->isEnabled(),
            'transactions' => $transactions,
        ]);
    }

    public function withdraw(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);

        $min = (float) config('hotbill.platform.min_withdrawal');
        $data = $request->validate([
            'amount' => "required|numeric|min:{$min}",
        ]);

        if (empty($tenant->payout_phone)) {
            return response()->json(['message' => 'Set a payout mobile-money number in Settings first.'], 422);
        }

        // `amount` is what the operator wants to RECEIVE. The withdrawal fee is
        // charged on top and pulled from the rest of the wallet, so the operator
        // gets the full amount and the wallet is debited amount + fee.
        $amount = (float) $data['amount'];
        $fee = \App\Services\MarzPayService::disbursementFee($amount);
        $total = round($amount + $fee, 2);

        if ($total > (float) $tenant->wallet_balance) {
            return response()->json([
                'message' => 'Not enough balance. Withdrawing ' . number_format($amount)
                    . ' costs ' . number_format($total) . ' (' . number_format($amount)
                    . ' + ' . number_format($fee) . ' fee), but your balance is '
                    . number_format((float) $tenant->wallet_balance) . '.',
            ], 422);
        }

        // Reserve the funds immediately with a ledger debit (status 'pending'),
        // then attempt the payout. With auto-disbursement off it stays 'pending'
        // for the admin to release manually; with MarzPay it goes 'processing'
        // and the webhook settles it. A UUID reference is required by MarzPay.
        // We debit the full amount+fee and send the full `amount` to the operator.
        $withdrawal = $tenant->postWallet('debit', $total, 'withdrawal', [
            'status' => 'pending',
            'reference' => (string) \Illuminate\Support\Str::uuid(),
            'description' => 'Withdrawal to ' . $tenant->payout_phone,
            'meta' => [
                'phone' => $tenant->payout_phone,
                'provider' => $tenant->payout_provider,
                'payout_fee' => $fee,
                'net_payout' => $amount,    // the amount actually sent to the operator
                'requested_amount' => $amount,
            ],
        ]);

        $status = $this->payouts->send($tenant, $withdrawal);

        // If the payout could not even be submitted (e.g. MarzPay rejected it or
        // had insufficient float), no disbursement exists and no webhook will ever
        // settle it — so the reserved debit must be refunded right here, otherwise
        // the operator loses the money for a withdrawal that never happened.
        if ($status === 'failed') {
            $tenant->postWallet('credit', $total, 'adjustment', [
                'status' => 'completed',
                'reference' => $withdrawal->reference,
                'description' => 'Refund: withdrawal could not be sent',
                'meta' => [
                    'withdrawal_id' => $withdrawal->id,
                    'reason' => 'payout_submission_failed',
                ],
            ]);
        }

        $withdrawal->update(['status' => $status]);

        $messages = [
            'completed' => 'Sent ' . number_format($amount) . ' to ' . $tenant->payout_phone . ' (' . number_format($fee) . ' fee deducted from your wallet).',
            'processing' => number_format($amount) . ' is being sent to ' . $tenant->payout_phone . ' (' . number_format($fee) . ' fee deducted from your wallet).',
            'failed' => 'Payout could not be sent — your balance has been kept. Please try again.',
        ];

        return response()->json([
            'message' => $messages[$status] ?? 'Withdrawal request submitted — pending approval.',
            'status' => $status,
            'fee' => $fee,
            'amount' => $amount,
            'total' => $total,
            'net' => $amount,
            'balance' => (float) $tenant->fresh()->wallet_balance,
        ]);
    }
}
