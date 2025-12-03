<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class SetOrganizationContext
{
    /**
     * Set the organization context for Spatie permissions
     * This middleware should run after authentication for all API routes
     * 
     * CRITICAL: This must run AFTER auth:sanctum middleware
     * to ensure $request->user() is available
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        
        if ($user) {
            // Get user profile
            $profile = DB::table('profiles')
                ->where('id', $user->id)
                ->first();

            if ($profile && $profile->organization_id) {
                // CRITICAL: Set the organization context for Spatie teams feature
                // This tells Spatie to only check permissions for this organization
                // Note: setPermissionsTeamId() is a global helper function, not a method on User
                setPermissionsTeamId($profile->organization_id);
                
                // Also add to request for easy access in controllers
                $request->merge(['_organization_id' => $profile->organization_id]);
                
                // Log for debugging (remove in production or set to info level)
                if (config('app.debug')) {
                    Log::debug('Organization context set', [
                        'user_id' => $user->id,
                        'user_email' => $user->email,
                        'organization_id' => $profile->organization_id,
                    ]);
                }
            } else {
                // Log warning if user doesn't have organization_id
                if (config('app.debug')) {
                    Log::warning('User missing organization_id', [
                        'user_id' => $user->id,
                        'user_email' => $user->email,
                        'has_profile' => $profile !== null,
                        'profile_org_id' => $profile->organization_id ?? null,
                    ]);
                }
            }
        }

        return $next($request);
    }
}
