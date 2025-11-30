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

        // Super admin can access all organizations
        if ($profile->role === 'super_admin' && $profile->organization_id === null) {
            return $next($request);
        }

        // Get organization_id from route or request
        $organizationId = $request->route('organization') 
            ?? $request->input('organization_id')
            ?? $request->header('X-Organization-ID');

        // If no organization specified, use user's organization
        if (!$organizationId) {
            $organizationId = $profile->organization_id;
        }

        // Check if user has access to this organization
        if ($profile->organization_id !== $organizationId && $profile->role !== 'super_admin') {
            return response()->json(['error' => 'Access denied to this organization'], 403);
        }

        // Add organization context to request
        $request->merge(['current_organization_id' => $organizationId]);

        return $next($request);
    }
}
