<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Response hardening. Static headers (HSTS, nosniff, frame-options, etc.) are
 * set at the nginx layer for blanket coverage; here we handle the pieces that
 * are easier to reason about per-response:
 *  - a strict Content-Security-Policy for JSON API responses (safe because JSON
 *    is never rendered; the captive-portal HTML is intentionally left alone), and
 *  - stripping the X-Powered-By leak as a backstop to php.ini's expose_php=Off.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $contentType = (string) $response->headers->get('Content-Type', '');
        if (str_contains($contentType, 'application/json')) {
            $response->headers->set(
                'Content-Security-Policy',
                "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
            );
        }

        $response->headers->remove('X-Powered-By');

        return $response;
    }
}
