<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gate for the platform (super-admin) panel. Only users with role
 * 'super_admin' may reach cross-tenant management endpoints.
 */
class EnsurePlatformAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (!$user || $user->role !== 'super_admin') {
            abort(403, 'Platform admin access required.');
        }

        return $next($request);
    }
}
