<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Foundation\Http\Middleware\PreventRequestsDuringMaintenance as Middleware;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Illuminate\Contracts\Foundation\Application;

/**
 * Custom maintenance mode middleware that allows login and platform admin routes
 * This replaces Laravel's default PreventRequestsDuringMaintenance middleware
 */
class CustomMaintenanceMode extends Middleware
{
    /**
     * The application instance.
     *
     * @var \Illuminate\Contracts\Foundation\Application
     */
    protected $app;

    /**
     * Create a new middleware instance.
     *
     * @param  \Illuminate\Contracts\Foundation\Application  $app
     * @return void
     */
    public function __construct(Application $app)
    {
        parent::__construct($app);
        $this->app = $app;
    }

    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     *
     * @throws \Symfony\Component\HttpKernel\Exception\HttpException
     * @throws \Illuminate\Foundation\Http\Exceptions\MaintenanceModeException
     */
    public function handle($request, Closure $next)
    {
        // Check if maintenance mode is active
        if ($this->app->maintenanceMode()->active()) {
            $data = $this->app->maintenanceMode()->data();
            
            // Allow login endpoints to work during maintenance
            $isLoginRoute = $request->is('api/auth/login') || 
                           $request->is('api/auth/*') ||
                           str_contains($request->path(), 'api/auth/login');
            
            if ($isLoginRoute) {
                // Allow login to proceed - don't block it
                return $next($request);
            }
            
            // Allow public maintenance status endpoint (so users can see maintenance page)
            $isPublicMaintenanceStatus = $request->is('api/maintenance/status/public') ||
                                        str_contains($request->path(), 'api/maintenance/status/public');
            
            if ($isPublicMaintenanceStatus) {
                // Allow public maintenance status to proceed - users need to see maintenance info
                return $next($request);
            }
            
            // Allow platform admin permissions endpoint (needed for frontend to check if user is platform admin)
            // This endpoint is used to show/hide platform admin button in dashboard
            // CRITICAL: Don't check $request->user() here because auth middleware hasn't run yet
            // The route itself requires auth:sanctum, so unauthenticated users will get 401 anyway
            $path = $request->path(); // Returns path like "api/platform/permissions/platform-admin"
            $url = $request->url(); // Full URL
            $isPlatformAdminPermissions = 
                $request->is('api/platform/permissions/platform-admin') ||
                $request->is('platform/permissions/platform-admin') ||
                $path === 'api/platform/permissions/platform-admin' ||
                $path === 'platform/permissions/platform-admin' ||
                str_ends_with($path, 'platform/permissions/platform-admin') ||
                str_contains($path, '/platform/permissions/platform-admin') ||
                str_contains($url, '/platform/permissions/platform-admin');
            
            if ($isPlatformAdminPermissions) {
                // Allow platform admin permissions endpoint to bypass maintenance mode
                // Authentication will be checked by auth:sanctum middleware
                // Permission check will be done by platform.admin middleware
                \Log::debug('Maintenance mode: Allowing platform admin permissions endpoint: ' . $path);
                return $next($request);
            }
            
            // Allow ALL platform admin routes to bypass maintenance mode
            // CRITICAL: Don't check $request->user() here because auth middleware hasn't run yet
            // The route itself requires auth:sanctum and platform.admin middleware, which will handle authentication and permission checks
            $isPlatformAdminRoute = $request->is('api/platform/*') || 
                                   $request->is('platform/*') ||
                                   str_contains($request->path(), 'api/platform') ||
                                   str_contains($request->path(), 'platform');
            
            if ($isPlatformAdminRoute) {
                // Allow all platform admin routes to bypass maintenance mode
                // Authentication and permission checks will be handled by auth:sanctum and platform.admin middleware
                \Log::debug('Maintenance mode: Allowing platform admin route: ' . $request->path());
                return $next($request);
            }
            
            // For all other routes, call parent to throw maintenance mode exception
            // The parent class will handle throwing the proper exception
            return parent::handle($request, $next);
        }

        return $next($request);
    }
}

