<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Package;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PackageController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $packages = Package::where('tenant_id', $request->user()->tenant_id)
            ->withCount('subscribers')
            ->latest()
            ->get();
        return response()->json($packages);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string',
            'type' => 'required|in:hotspot,pppoe',
            'price' => 'required|numeric|min:0',
            'speed_up' => 'nullable|integer|min:0',
            'speed_down' => 'nullable|integer|min:0',
            'data_limit_mb' => 'nullable|integer|min:0',
            'duration_days' => 'nullable|integer|min:0',
            'duration_hours' => 'nullable|integer|min:0',
            'duration_minutes' => 'nullable|integer|min:0',
            'burst_up' => 'nullable|integer',
            'burst_down' => 'nullable|integer',
            'burst_threshold_up' => 'nullable|integer',
            'burst_threshold_down' => 'nullable|integer',
            'burst_time' => 'nullable|integer',
            'pool_name' => 'nullable|string',
            'billing_starts' => 'nullable|in:first_use,on_purchase',
            'is_active' => 'nullable|boolean',
        ]);

        $package = Package::create(array_merge($data, [
            'tenant_id' => $request->user()->tenant_id,
        ]));

        return response()->json($package, 201);
    }

    public function show(Request $request, Package $package): JsonResponse
    {
        abort_if($package->tenant_id !== $request->user()->tenant_id, 403);
        return response()->json($package->load('subscribers'));
    }

    public function update(Request $request, Package $package): JsonResponse
    {
        abort_if($package->tenant_id !== $request->user()->tenant_id, 403);

        $data = $request->validate([
            'name' => 'sometimes|string|max:100',
            'description' => 'nullable|string',
            'price' => 'sometimes|numeric|min:0',
            'speed_up' => 'nullable|integer',
            'speed_down' => 'nullable|integer',
            'data_limit_mb' => 'nullable|integer',
            'data_limit_mb' => 'nullable|integer',
            'duration_days' => 'nullable|integer',
            'duration_hours' => 'nullable|integer',
            'duration_minutes' => 'nullable|integer',
            'burst_up' => 'nullable|integer',
            'burst_down' => 'nullable|integer',
            'burst_threshold_up' => 'nullable|integer',
            'burst_threshold_down' => 'nullable|integer',
            'burst_time' => 'nullable|integer',
            'pool_name' => 'nullable|string',
            'billing_starts' => 'nullable|in:first_use,on_purchase',
            'is_active' => 'nullable|boolean',
        ]);

        $package->update($data);
        return response()->json($package);
    }

    public function destroy(Request $request, Package $package): JsonResponse
    {
        abort_if($package->tenant_id !== $request->user()->tenant_id, 403);
        $package->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
