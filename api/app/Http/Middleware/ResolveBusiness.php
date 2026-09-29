<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves which business (tenant) the authenticated request operates on.
 *
 * The frontend sends `X-Business-Id` with every request. If the user is a member
 * of that business we override their `tenant_id` in memory for this request only
 * (no DB write), so every existing `$request->user()->tenant_id` query is scoped
 * to the selected business. Missing/invalid headers fall back to the user's
 * persisted home tenant - keeping older clients working.
 */
class ResolveBusiness
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $businessId = (int) $request->header('X-Business-Id');

        if ($user && $businessId && $businessId !== (int) $user->tenant_id) {
            if ($user->belongsToTenant($businessId)) {
                $user->tenant_id = $businessId; // in-memory only, not saved
                $user->setRelation('tenant', Tenant::find($businessId));
            }
        }

        // A business a platform admin has suspended keeps its hotspot running
        // (customers are not punished) but its team is locked out of the
        // dashboard - and therefore of withdrawals - until it is reinstated.
        // Sign-out, profile and switching to another business stay open.
        if ($user && $user->role !== 'super_admin' && !$request->is('api/v1/auth/*', 'api/v1/businesses', 'api/v1/businesses/*', 'api/v1/admin/*')) {
            $tenant = $user->relationLoaded('tenant') ? $user->tenant : Tenant::find($user->tenant_id);
            if ($tenant && !$tenant->is_active) {
                return response()->json([
                    'message' => 'This business has been suspended. Please contact HotBill support.',
                    'suspended' => true,
                ], 403);
            }
        }

        return $next($request);
    }
}
