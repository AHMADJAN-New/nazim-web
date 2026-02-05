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
        
        // CRITICAL: Replace Laravel's default maintenance mode middleware with our custom one
        // This allows login and platform admin routes to work during maintenance
        $middleware->replace(
            \Illuminate\Foundation\Http\Middleware\PreventRequestsDuringMaintenance::class,
            \App\Http\Middleware\CustomMaintenanceMode::class
        );
        
        // Force JSON responses for all API routes
        $middleware->api(prepend: [
            \App\Http\Middleware\ForceJsonResponse::class,
        ]);
        
        // Log download traffic for bandwidth monitoring
        $middleware->api(append: [
            \App\Http\Middleware\LogDownloadTraffic::class,
        ]);
        
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
            'token.from.query' => \App\Http\Middleware\AcceptTokenFromQuery::class,
            'public.website.resolve' => \App\Http\Middleware\ResolvePublicWebsiteSchool::class,
            'public.website.feature' => \App\Http\Middleware\EnsurePublicWebsiteFeature::class,
            'log.activity' => \App\Http\Middleware\LogActivity::class,
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
        
        // Handle maintenance mode for API routes - return JSON with message
        // BUT allow login endpoints and platform admin routes to bypass maintenance mode
        $exceptions->render(function (\Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException $e, \Illuminate\Http\Request $request) {
            // Check if maintenance mode file exists to confirm this is maintenance mode
            $maintenanceFilePath = storage_path('framework/down');
            if (!\Illuminate\Support\Facades\File::exists($maintenanceFilePath)) {
                // Not maintenance mode, let Laravel handle it
                return null;
            }
            
            // Get maintenance data from file
            $maintenanceData = [];
            try {
                $maintenanceData = json_decode(\Illuminate\Support\Facades\File::get($maintenanceFilePath), true) ?? [];
            } catch (\Exception $fileException) {
                // Ignore file read errors
            }
            
            // Check if bypass flag is set (from BypassMaintenanceForRoutes middleware)
            if ($request->attributes->get('bypass_maintenance', false)) {
                // Allow request to proceed - don't block it
                return null;
            }
            
            // Allow login endpoints to work during maintenance (so platform admins can log in)
            $isLoginRoute = $request->is('api/auth/login') || 
                           $request->is('api/auth/*') ||
                           str_contains($request->path(), 'api/auth/login');
            
            if ($isLoginRoute) {
                // Allow login to proceed - don't block it
                return null;
            }
            
            // Allow public maintenance status endpoint (so users can see maintenance page)
            $isPublicMaintenanceStatus = $request->is('api/maintenance/status/public') ||
                                        str_contains($request->path(), 'api/maintenance/status/public');
            
            if ($isPublicMaintenanceStatus) {
                // Allow public maintenance status to proceed - users need to see maintenance info
                return null;
            }
            
            // Allow platform admin permissions endpoint (needed for frontend to check if user is platform admin)
            // This endpoint is used to show/hide platform admin button in dashboard
            // CRITICAL: Don't check $request->user() here because auth middleware might not have run yet
            // The route itself requires auth:sanctum, so unauthenticated users will get 401 anyway
            $path = $request->path(); // Returns path like "api/platform/permissions/platform-admin"
            $isPlatformAdminPermissions = 
                $request->is('api/platform/permissions/platform-admin') ||
                $request->is('platform/permissions/platform-admin') ||
                $path === 'api/platform/permissions/platform-admin' ||
                $path === 'platform/permissions/platform-admin' ||
                str_ends_with($path, 'platform/permissions/platform-admin') ||
                str_contains($path, '/platform/permissions/platform-admin');
            
            if ($isPlatformAdminPermissions) {
                // Allow platform admin permissions endpoint to bypass maintenance mode
                // Authentication will be checked by auth:sanctum middleware
                // Permission check will be done by platform.admin middleware
                return null;
            }
            
            // Allow ALL platform admin routes to bypass maintenance mode
            // CRITICAL: Don't check $request->user() here because auth middleware might not have run yet
            // The route itself requires auth:sanctum and platform.admin middleware, which will handle authentication and permission checks
            $isPlatformAdminRoute = $request->is('api/platform/*') || 
                                   $request->is('platform/*') ||
                                   str_contains($request->path(), 'api/platform') ||
                                   str_contains($request->path(), 'platform');
            
            if ($isPlatformAdminRoute) {
                // Allow all platform admin routes to bypass maintenance mode
                // Authentication and permission checks will be handled by auth:sanctum and platform.admin middleware
                return null;
            }
            
            // For API routes or JSON requests, return JSON response with maintenance message
            if ($request->is('api/*') || $request->expectsJson()) {
                $message = $maintenanceData['message'] ?? $e->getMessage() ?? 'We are performing scheduled maintenance. We\'ll be back soon!';
                $retryAfter = $maintenanceData['retry'] ?? null;
                $scheduledEnd = $maintenanceData['scheduled_end'] ?? $maintenanceData['scheduled_end_at'] ?? null;
                
                return response()->json([
                    'message' => $message,
                    'error' => $message,
                    'retry_after' => $retryAfter,
                    'retry' => $retryAfter,
                    'scheduled_end' => $scheduledEnd,
                    'scheduled_end_at' => $scheduledEnd,
                ], 503);
            }
            
            // For web routes, let Laravel handle it normally (will show HTML maintenance page)
            return null;
        });
        
        // CRITICAL: Handle ValidationException BEFORE the generic handler
        // Validation errors are ALWAYS safe to show - they're user-facing feedback
        // This ensures validation errors are returned even when APP_DEBUG=false
        $exceptions->render(function (\Illuminate\Validation\ValidationException $e, \Illuminate\Http\Request $request) {
            // For API routes, always return JSON with validation errors
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'message' => 'The given data was invalid.',
                    'error' => 'Validation failed',
                    'errors' => $e->errors(), // CRITICAL: Always include validation errors (safe to show)
                ], 422);
            }
            
            // For web routes, let Laravel handle it normally (will redirect back with errors)
            return null;
        });
        
        // Handle all other exceptions for API routes - ensure they return JSON
        // This must come LAST so specific handlers above can handle their exceptions first
        $exceptions->render(function (\Throwable $e, \Illuminate\Http\Request $request) {
            // For API routes, always return JSON, never HTML
            if ($request->is('api/*') || $request->expectsJson()) {
                $statusCode = 500;
                
                // Try to get status code from exception
                if (method_exists($e, 'getStatusCode')) {
                    $statusCode = $e->getStatusCode();
                } elseif (method_exists($e, 'getCode') && $e->getCode() >= 400 && $e->getCode() < 600) {
                    $statusCode = $e->getCode();
                }
                
                // Client errors (400-499): Show message in production (usually safe)
                // Server errors (500+): Hide details in production (may contain sensitive info)
                if ($statusCode >= 400 && $statusCode < 500) {
                    // Client errors - safe to show in production
                    return response()->json([
                        'message' => $e->getMessage() ?: 'Invalid request',
                        'error' => $e->getMessage() ?: 'Invalid request',
                    ], $statusCode);
                } else {
                    // Server errors - hide details in production for security
                    return response()->json([
                        'message' => config('app.debug') ? $e->getMessage() : 'An error occurred. Please try again later.',
                        'error' => config('app.debug') ? $e->getMessage() : 'An error occurred. Please try again later.',
                    ], $statusCode);
                }
            }
            
            return null;
        });
    })->create();
