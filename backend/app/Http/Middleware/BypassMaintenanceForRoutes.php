<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware to bypass maintenance mode for specific routes
 * This runs BEFORE Laravel's built-in maintenance mode middleware
 */
class BypassMaintenanceForRoutes
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Check if maintenance mode is active
        $maintenanceFilePath = storage_path('framework/down');
        if (!File::exists($maintenanceFilePath)) {
            // Maintenance mode is not active, proceed normally
            return $next($request);
        }

        // Maintenance mode is active - check if this route should be allowed
        
        // Allow login endpoints (so users can log in during maintenance)
        $isLoginRoute = $request->is('api/auth/login') || 
                       $request->is('api/auth/*') ||
                       str_contains($request->path(), 'api/auth/login');
        
        if ($isLoginRoute) {
            // Set a flag to bypass maintenance mode for this request
            $request->attributes->set('bypass_maintenance', true);
            // Allow login to proceed - don't block it
            return $next($request);
        }

        // Allow platform admin routes if user is authenticated and has platform admin permission
        $isPlatformAdminRoute = $request->is('api/platform/*') || 
                               $request->is('platform/*') ||
                               str_contains($request->path(), 'api/platform') ||
                               str_contains($request->path(), 'platform');
        
        if ($isPlatformAdminRoute && $request->user()) {
            try {
                // Clear team context to check global permissions
                setPermissionsTeamId(null);
                
                // Check if user has subscription.admin permission (global)
                if ($request->user()->hasPermissionTo('subscription.admin')) {
                    // Platform admin can bypass maintenance mode - allow the request
                    return $next($request);
                }
            } catch (\Exception $permException) {
                // If permission check fails, continue with maintenance mode blocking
                \Log::debug('Could not check platform admin permission in bypass middleware: ' . $permException->getMessage());
            }
        }

        // For all other routes, let Laravel's maintenance mode middleware handle it
        // This will throw MaintenanceModeException which will be caught by the exception handler
        return $next($request);
    }
}

