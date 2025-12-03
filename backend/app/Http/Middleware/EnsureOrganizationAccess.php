<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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

        // Get user profile
        $profile = DB::table('profiles')
            ->where('id', $user->id)
            ->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Get organization_id from route or request
        $organizationId = $request->route('organization') 
            ?? $request->input('organization_id')
            ?? $request->header('X-Organization-ID');

        // If no organization specified, use user's organization
        if (!$organizationId) {
            $organizationId = $profile->organization_id;
        }

        // Check if user has access to this organization (all users)
        if ($profile->organization_id !== $organizationId) {
            return response()->json(['error' => 'Access denied to this organization'], 403);
        }

        // CRITICAL: Set the organization context for Spatie teams feature
        // This tells Spatie to only check permissions for this organization
        // Note: setPermissionsTeamId() is a global helper function, not a method on User
        setPermissionsTeamId($organizationId);

        // Add organization context to request
        $request->merge(['current_organization_id' => $organizationId]);

        return $next($request);
    }
}
