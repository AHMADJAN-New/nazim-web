<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\HandleCors;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // API routes use token-based authentication (Bearer tokens)
        // No need for stateful middleware or CSRF protection
        // Remove Sanctum stateful middleware from API routes
        
        // Add CORS middleware to global middleware stack
        $middleware->append(HandleCors::class);
        
        $middleware->alias([
            'auth' => \App\Http\Middleware\Authenticate::class,
            'auth.sanctum' => \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
            'organization' => \App\Http\Middleware\EnsureOrganizationAccess::class,
            'platform.admin' => \App\Http\Middleware\EnsurePlatformAdmin::class,
            'org.context' => \App\Http\Middleware\SetOrganizationContext::class,
            'school.context' => \App\Http\Middleware\EnsureSchoolContext::class,
            'subscription' => \App\Http\Middleware\EnsureSubscriptionAccess::class,
            'feature' => \App\Http\Middleware\EnsureFeatureAccess::class,
            'limit' => \App\Http\Middleware\EnforceUsageLimit::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Handle unauthenticated requests for API routes
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, \Illuminate\Http\Request $request) {
            // For API routes, always return JSON 401, never try to redirect
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'message' => 'Unauthenticated.',
                ], 401);
            }
            
            // For web routes, let Laravel handle it normally (will use redirectTo)
            return null;
        });
        
        // Catch RouteNotFoundException for API routes (prevents "Route [login] not defined" errors)
        $exceptions->render(function (\Symfony\Component\Routing\Exception\RouteNotFoundException $e, \Illuminate\Http\Request $request) {
            // If this is an API route and the missing route is 'login', return 401 JSON instead
            if ($request->is('api/*') && str_contains($e->getMessage(), 'login')) {
                return response()->json([
                    'message' => 'Unauthenticated.',
                ], 401);
            }
            
            // Let Laravel handle other route not found errors normally
            return null;
        });
    })->create();
