<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class EnsurePlatformAdmin
{
    /**
     * Handle an incoming request.
     * 
     * This middleware allows platform admins (with subscription.admin permission)
     * to access platform management features without requiring organization_id.
     * Platform admins are NOT tied to any organization.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Check for subscription.admin permission (global, not organization-scoped)
        try {
            // CRITICAL: Clear any organization context FIRST before checking global permissions
            // This ensures we're checking for global permissions, not organization-scoped ones
            setPermissionsTeamId(null);
            
            // NOTE: We don't clear the permission cache here - it should only be cleared when
            // permissions actually change, not on every request. Spatie automatically clears
            // the cache when permissions/roles are updated through its models.
            
            // CRITICAL: Use platform org UUID as team context for global permissions
            // Global permissions are stored with platform org UUID (00000000-0000-0000-0000-000000000000)
            // in model_has_permissions, but the permission itself has organization_id = NULL
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            
            if (!$user->hasPermissionTo('subscription.admin')) {
                Log::warning('Platform admin access denied', [
                    'user_id' => $user->id,
                    'email' => $user->email ?? null,
                ]);
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'This endpoint is only accessible to platform administrators.',
                ], 403);
            }

            Log::debug('Platform admin access granted', [
                'user_id' => $user->id,
                'email' => $user->email ?? null,
            ]);

            // Mark request as platform admin request
            $request->merge(['is_platform_admin' => true]);

            return $next($request);
        } catch (\Exception $e) {
            Log::error('Platform admin permission check failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'Failed to verify platform administrator access.',
            ], 403);
        }
    }
}

