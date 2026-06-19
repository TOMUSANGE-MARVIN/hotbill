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
 * persisted home tenant — keeping older clients working.
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

        return $next($request);
    }
}
