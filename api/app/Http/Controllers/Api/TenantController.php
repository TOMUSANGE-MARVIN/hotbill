<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TenantController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json(Tenant::findOrFail($request->user()->tenant_id));
    }

    /**
     * Update the current organization's general settings (incl. payout number).
     */
    public function update(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);

        $data = $request->validate([
            'name' => 'sometimes|string|max:120',
            'phone' => 'nullable|string|max:20',
            'currency' => 'sometimes|string|max:10',
            'timezone' => 'sometimes|string|max:64',
            'payout_phone' => 'nullable|string|max:20',
            'payout_provider' => 'nullable|in:mtn,airtel',
        ]);

        $tenant->update($data);

        return response()->json($tenant);
    }
}
