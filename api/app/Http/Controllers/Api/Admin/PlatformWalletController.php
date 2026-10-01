<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PlatformWithdrawal;
use App\Models\PortalOrder;
use App\Models\Tenant;
use App\Models\WalletTransaction;
use App\Services\MarzPayService;
use App\Services\PlatformWalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class PlatformWalletController extends Controller
{
    public function __construct(private PlatformWalletService $wallet) {}

    public function show(Request $request): JsonResponse
    {
        $summary = $this->wallet->summary();

        // Platform earnings per month, both sources.
        $hotspot = PortalOrder::where('status', 'paid')->where('paid_at', '>=', now()->subMonths(5)->startOfMonth())
            ->selectRaw("DATE_FORMAT(paid_at, '%Y-%m') as m, SUM(platform_fee) as v")->groupBy('m')->pluck('v', 'm');
        $voucher = WalletTransaction::where('source', 'voucher_commission')->where('type', 'debit')->where('status', 'completed')
            ->where('created_at', '>=', now()->subMonths(5)->startOfMonth())
            ->selectRaw("DATE_FORMAT(created_at, '%Y-%m') as m, SUM(amount) as v")->groupBy('m')->pluck('v', 'm');
        $months = collect(range(5, 0))->map(function ($i) use ($hotspot, $voucher) {
            $m = now()->subMonths($i)->format('Y-m');
            return ['month' => $m, 'hotspot' => (float) ($hotspot[$m] ?? 0), 'voucher' => (float) ($voucher[$m] ?? 0)];
        });

        return response()->json([
            'summary' => $summary,
            'max_sendable' => $this->wallet->maxSendable($summary['withdrawable']),
            'default_phone' => $request->user()->phone,
            'monthly' => $months,
            'operators' => Tenant::where('wallet_balance', '<>', 0)->orderByDesc('wallet_balance')
                ->get(['id', 'name', 'wallet_balance', 'payout_phone']),
            'withdrawals' => PlatformWithdrawal::with('user:id,name')->latest('id')->limit(50)->get(),
        ]);
    }

    public function fee(Request $request): JsonResponse
    {
        $amount = (float) $request->query('amount', 0);

        return response()->json(['amount' => $amount, 'fee' => MarzPayService::disbursementFee($amount)]);
    }

    public function withdraw(Request $request): JsonResponse
    {
        $min = (float) config('hotbill.platform.min_withdrawal', 1000);
        $data = $request->validate([
            'amount' => "required|numeric|min:{$min}|max:50000000",
            'phone' => ['required', 'string', 'regex:/^(\+?256|0)?7\d{8}$/'],
            'password' => 'required|string',
            'note' => 'nullable|string|max:255',
        ], ['phone.regex' => 'Enter a Ugandan mobile number, e.g. 0772123456.']);

        if (!Hash::check($data['password'], $request->user()->password)) {
            return response()->json(['message' => 'Password is incorrect.', 'errors' => ['password' => ['Password is incorrect.']]], 422);
        }

        try {
            $w = $this->wallet->withdraw($request->user(), (float) $data['amount'], $data['phone'], $data['note'] ?? null);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'withdrawal' => $w,
            'message' => $w->status === 'failed'
                ? 'MarzPay did not accept the payout, so nothing was sent: ' . $w->error
                : 'Sending ' . number_format((float) $w->amount) . ' to ' . $w->phone . '. It usually arrives within a minute.',
        ], $w->status === 'failed' ? 422 : 200);
    }

    public function refresh(PlatformWithdrawal $withdrawal): JsonResponse
    {
        $result = $this->wallet->reconcile($withdrawal);

        return response()->json(['status' => $withdrawal->fresh()->status, 'changed' => $result !== null]);
    }
}
