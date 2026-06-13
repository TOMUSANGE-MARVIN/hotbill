<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Expense::where('tenant_id', $request->user()->tenant_id);

        if ($request->start_date) $query->where('expense_date', '>=', $request->start_date);
        if ($request->end_date) $query->where('expense_date', '<=', $request->end_date);
        if ($request->category) $query->where('category', $request->category);

        return response()->json($query->orderByDesc('expense_date')->paginate(50));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'description' => 'required|string',
            'category' => 'nullable|string',
            'amount' => 'required|numeric|min:0',
            'expense_date' => 'required|date',
            'notes' => 'nullable|string',
        ]);

        $expense = Expense::create(array_merge($data, [
            'tenant_id' => $request->user()->tenant_id,
            'user_id' => $request->user()->id,
        ]));

        return response()->json($expense, 201);
    }

    public function update(Request $request, Expense $expense): JsonResponse
    {
        abort_if($expense->tenant_id !== $request->user()->tenant_id, 403);
        $expense->update($request->validate([
            'description' => 'sometimes|string',
            'category' => 'nullable|string',
            'amount' => 'sometimes|numeric',
            'expense_date' => 'sometimes|date',
            'notes' => 'nullable|string',
        ]));
        return response()->json($expense);
    }

    public function destroy(Request $request, Expense $expense): JsonResponse
    {
        abort_if($expense->tenant_id !== $request->user()->tenant_id, 403);
        $expense->delete();
        return response()->json(['message' => 'Deleted']);
    }

    public function summary(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        return response()->json([
            'total' => Expense::where('tenant_id', $tenantId)->sum('amount'),
            'this_month' => Expense::where('tenant_id', $tenantId)
                ->whereMonth('expense_date', now()->month)->sum('amount'),
            'by_category' => Expense::where('tenant_id', $tenantId)
                ->selectRaw('category, SUM(amount) as total')->groupBy('category')->get(),
        ]);
    }
}
