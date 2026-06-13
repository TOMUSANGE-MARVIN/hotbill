<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AgentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $agents = Agent::where('tenant_id', $request->user()->tenant_id)
            ->withCount('subscribers')
            ->withSum('transactions as total_sales_sum', 'amount')
            ->latest()
            ->get();
        return response()->json($agents);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string',
            'phone' => 'required|string|unique:agents,phone',
            'email' => 'nullable|email',
            'location' => 'nullable|string',
            'commission_rate' => 'nullable|numeric|min:0|max:100',
        ]);

        $agent = Agent::create(array_merge($data, [
            'tenant_id' => $request->user()->tenant_id,
        ]));

        return response()->json($agent, 201);
    }

    public function show(Request $request, Agent $agent): JsonResponse
    {
        abort_if($agent->tenant_id !== $request->user()->tenant_id, 403);
        return response()->json($agent->load('transactions', 'subscribers'));
    }

    public function update(Request $request, Agent $agent): JsonResponse
    {
        abort_if($agent->tenant_id !== $request->user()->tenant_id, 403);

        $data = $request->validate([
            'name' => 'sometimes|string',
            'phone' => 'sometimes|string',
            'email' => 'nullable|email',
            'location' => 'nullable|string',
            'commission_rate' => 'nullable|numeric|min:0|max:100',
            'is_active' => 'nullable|boolean',
        ]);

        $agent->update($data);
        return response()->json($agent);
    }

    public function destroy(Request $request, Agent $agent): JsonResponse
    {
        abort_if($agent->tenant_id !== $request->user()->tenant_id, 403);
        $agent->delete();
        return response()->json(['message' => 'Deleted']);
    }

    public function topup(Request $request, Agent $agent): JsonResponse
    {
        abort_if($agent->tenant_id !== $request->user()->tenant_id, 403);

        $data = $request->validate(['amount' => 'required|numeric|min:1']);
        $agent->increment('balance', $data['amount']);
        return response()->json(['balance' => $agent->fresh()->balance]);
    }
}
