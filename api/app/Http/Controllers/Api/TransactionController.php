<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Transaction::where('tenant_id', $request->user()->tenant_id)
            ->with('subscriber', 'agent', 'package');

        if ($request->start_date) $query->whereDate('paid_at', '>=', $request->start_date);
        if ($request->end_date) $query->whereDate('paid_at', '<=', $request->end_date);
        if ($request->method) $query->where('method', $request->method);
        if ($request->status) $query->where('status', $request->status);
        if ($request->agent_id) $query->where('agent_id', $request->agent_id);
        if ($request->type) $query->where('type', $request->type);

        return response()->json($query->latest('paid_at')->paginate(50));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subscriber_id' => 'nullable|exists:subscribers,id',
            'agent_id' => 'nullable|exists:agents,id',
            'package_id' => 'nullable|exists:packages,id',
            'type' => 'required|in:topup,manual,subscription',
            'method' => 'required|in:mtn_momo,airtel_money,cash,card,bank',
            'amount' => 'required|numeric|min:0',
            'commission' => 'nullable|numeric|min:0',
            'phone' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $data['tenant_id'] = $request->user()->tenant_id;
        $data['commission'] = $data['commission'] ?? 0;
        $data['net_amount'] = $data['amount'] - $data['commission'];
        $data['status'] = 'completed';
        $data['paid_at'] = now();

        $transaction = Transaction::create($data);
        return response()->json($transaction, 201);
    }

    public function show(Request $request, Transaction $transaction): JsonResponse
    {
        abort_if($transaction->tenant_id !== $request->user()->tenant_id, 403);
        return response()->json($transaction->load('subscriber', 'agent', 'voucher', 'package'));
    }

    public function summary(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $start = $request->start_date ?? now()->startOfMonth()->toDateString();
        $end = $request->end_date ?? now()->toDateString();

        $base = Transaction::where('tenant_id', $tenantId)
            ->where('status', 'completed')
            ->whereBetween('paid_at', [$start . ' 00:00:00', $end . ' 23:59:59']);

        return response()->json([
            'net_sales' => $base->sum('net_amount'),
            'gross_sales' => $base->sum('amount'),
            'commission' => $base->sum('commission'),
            'total_transactions' => $base->count(),
            'by_method' => $base->selectRaw('method, SUM(amount) as total, COUNT(*) as count')
                ->groupBy('method')->get(),
            'by_agent' => $base->with('agent:id,name')
                ->selectRaw('agent_id, SUM(amount) as total, COUNT(*) as count')
                ->groupBy('agent_id')->get(),
            'daily' => $base->selectRaw('DATE(paid_at) as date, SUM(net_amount) as net, SUM(commission) as commission, SUM(amount) as gross')
                ->groupBy('date')->orderBy('date')->get(),
        ]);
    }
}
