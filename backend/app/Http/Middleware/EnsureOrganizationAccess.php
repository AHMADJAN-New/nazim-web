<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class EnsureOrganizationAccess
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // CRITICAL: Skip organization context for platform admin routes
        // Platform admin routes use /api/platform/* and should NOT have organization context set
        // The EnsurePlatformAdmin middleware handles platform admin authentication
        $path = $request->path();
        $uri = $request->getRequestUri();
        
        // Check if this is a platform admin route (multiple ways to detect)
        // CRITICAL: Check both path() and getRequestUri() to catch all cases
        $isPlatformRoute = str_starts_with($path, 'api/platform') || 
                          str_starts_with($path, 'platform') ||
                          str_contains($uri, '/api/platform') ||
                          str_contains($uri, '/platform');
        
        if ($isPlatformRoute) {
            // Platform admin routes - don't set organization context
            // The EnsurePlatformAdmin middleware already handles permission checks
            // CRITICAL: Clear any existing organization context to prevent interference
            setPermissionsTeamId(null);
            // CRITICAL: Don't log organization context for platform routes (reduces log noise)
            return $next($request);
        }

        // Get user profile
        $profile = DB::table('profiles')
            ->where('id', $user->id)
            ->first();

        if (!$profile) {
            Log::error('Profile not found for authenticated user', [
                'user_id' => $user->id,
                'email' => $user->email ?? null,
            ]);
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users EXCEPT platform admins
        // Platform admins have subscription.admin permission and organization_id = NULL
        if (!$profile->organization_id) {
            // Check if user is a platform admin (has global subscription.admin permission)
            try {
                setPermissionsTeamId(null); // Clear team context to check global permissions
                $isPlatformAdmin = $user->hasPermissionTo('subscription.admin');
                
                if ($isPlatformAdmin) {
                    // Platform admins can access routes without organization_id
                    // They use platform routes (/api/platform/*) which don't require organization
                    Log::debug('Platform admin accessing route without organization_id', [
                        'user_id' => $user->id,
                        'email' => $user->email ?? null,
                    ]);
                    // Don't set organization context for platform admins
                    return $next($request);
                }
            } catch (\Exception $e) {
                // If permission check fails, treat as regular user
                Log::debug('Could not check platform admin permission in middleware: ' . $e->getMessage());
            }
            
            // Regular users must have organization_id
            Log::warning('User has no organization assigned', [
                'user_id' => $user->id,
                'profile_id' => $profile->id,
            ]);
            return response()->json([
                'error' => 'User must be assigned to an organization',
                'message' => 'Please contact your administrator to assign you to an organization.'
            ], 403);
        }

        // Always use the user's organization_id for all users
        // No need to check route/request/header organization - users can only access their own org
        $organizationId = $profile->organization_id;

        // 🎯 CRITICAL FIX: Set organization context for Spatie permissions
        // This tells Spatie which organization to check permissions in
        // Without this, hasPermissionTo() will always return false for org-scoped permissions
        try {
            // Set team context
            // NOTE: We don't clear the permission cache here - it should only be cleared when
            // permissions actually change, not on every request. Spatie automatically clears
            // the cache when permissions/roles are updated through its models.
            setPermissionsTeamId($organizationId);

            Log::debug('Organization context set for permissions', [
                'user_id' => $user->id,
                'organization_id' => $organizationId,
                'team_id' => getPermissionsTeamId(),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to set permissions team ID', [
                'user_id' => $user->id,
                'organization_id' => $organizationId,
                'error' => $e->getMessage(),
            ]);
            // Continue anyway - controllers will handle permission errors
        }

        // Add organization context to request for easy access in controllers
        $request->merge(['current_organization_id' => $organizationId]);

        return $next($request);
    }
}
