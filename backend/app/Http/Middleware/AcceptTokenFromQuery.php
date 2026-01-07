<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware to accept authentication token from query parameter
 * This is useful for development/testing when accessing routes directly in browser
 * 
 * CRITICAL: Only works in development mode (APP_DEBUG=true)
 * In production, this middleware does nothing
 */
class AcceptTokenFromQuery
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Only in development mode
        if (!config('app.debug')) {
            return $next($request);
        }

        // If token is provided in query parameter and no Authorization header exists
        if ($request->has('token') && !$request->hasHeader('Authorization')) {
            $token = $request->get('token');
            if ($token) {
                // Set Authorization header for Sanctum
                $request->headers->set('Authorization', 'Bearer ' . $token);
            }
        }

        return $next($request);
    }
}

