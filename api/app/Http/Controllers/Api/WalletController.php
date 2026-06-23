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

        $amount = (float) $data['amount'];
        if ($amount > (float) $tenant->wallet_balance) {
            return response()->json(['message' => 'Amount exceeds your available balance.'], 422);
        }

        // Reserve the funds immediately with a ledger debit (status 'pending'),
        // then attempt the payout. With auto-disbursement off, it stays 'pending'
        // for the admin to release manually after sending the money.
        $withdrawal = $tenant->postWallet('debit', $amount, 'withdrawal', [
            'status' => 'pending',
            'description' => 'Withdrawal to ' . $tenant->payout_phone,
            'meta' => ['phone' => $tenant->payout_phone, 'provider' => $tenant->payout_provider],
        ]);

        $status = $this->payouts->send($tenant, $withdrawal);
        $withdrawal->update(['status' => $status]);

        return response()->json([
            'message' => $status === 'completed'
                ? 'Withdrawal sent to ' . $tenant->payout_phone
                : 'Withdrawal request submitted — pending approval.',
            'status' => $status,
            'balance' => (float) $tenant->fresh()->wallet_balance,
        ]);
    }
}
