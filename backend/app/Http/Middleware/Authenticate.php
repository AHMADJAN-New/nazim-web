<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

class Authenticate extends Middleware
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     * 
     * For API routes, we NEVER redirect - just return null to get a clean 401 JSON response.
     * This prevents "Route [login] not defined" errors for unauthenticated API requests.
     * 
     * IMPORTANT: We NEVER call route('login') here to avoid RouteNotFoundException.
     * The exception handler in bootstrap/app.php will catch AuthenticationException
     * and return proper JSON 401 responses for API routes.
     */
    protected function redirectTo(Request $request): ?string
    {
        // For API routes we NEVER redirect – always return null to get 401 JSON.
        // Check this FIRST before expectsJson() to catch browser requests to /api/*
        if ($request->is('api/*')) {
            return null;
        }

        // For JSON requests, also return null (no redirect)
        if ($request->expectsJson()) {
            return null;
        }

        // For non-API web routes, return null (no login route defined yet)
        // NEVER call route('login') here - it will cause RouteNotFoundException
        // If you add a web login page later, you can return the URL string directly
        // Example: return '/login'; (not route('login'))
        return null;
    }
}
