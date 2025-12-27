<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Enforce current school context for ALL school-scoped endpoints.
 *
 * Rule: Everything is school-scoped EXCEPT permissions/roles/org management.
 * Source of truth: profiles.default_school_id (NOT request input).
 */
class EnsureSchoolContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            // Organization scope must already be enforced; fail safe here too.
            return response()->json([
                'error' => 'User must be assigned to an organization',
            ], 403);
        }

        $schoolId = $profile->default_school_id;

        // If user has no default school, try to auto-assign the first active school in org.
        // This prevents the app from bricking on orgs that already have schools but older profiles.
        if (!$schoolId) {
            $firstSchoolId = DB::table('school_branding')
                ->where('organization_id', $profile->organization_id)
                ->whereNull('deleted_at')
                ->orderBy('created_at', 'asc')
                ->value('id');

            if ($firstSchoolId) {
                DB::table('profiles')
                    ->where('id', $profile->id)
                    ->update([
                        'default_school_id' => $firstSchoolId,
                        'updated_at' => now(),
                    ]);

                $schoolId = $firstSchoolId;
            }
        }

        if (!$schoolId) {
            Log::warning('User has no default_school_id (school context required)', [
                'user_id' => $user->id,
                'organization_id' => $profile->organization_id,
            ]);

            return response()->json([
                'error' => 'User must be assigned to a school',
                'message' => 'Please set a default school for this user.',
            ], 403);
        }

        // Validate school belongs to the user organization
        $school = DB::table('school_branding')
            ->where('id', $schoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$school || $school->organization_id !== $profile->organization_id) {
            Log::warning('Invalid default_school_id for user (not found or wrong org)', [
                'user_id' => $user->id,
                'organization_id' => $profile->organization_id,
                'default_school_id' => $schoolId,
                'school_org_id' => $school->organization_id ?? null,
            ]);

            return response()->json([
                'error' => 'Invalid school context',
                'message' => 'Your assigned school is not available. Please contact your administrator.',
            ], 403);
        }

        // Check if user has schools_access_all permission
        $hasSchoolsAccessAll = (bool) ($profile->schools_access_all ?? false);
        
        // If user has schools_access_all, allow switching schools via query parameter
        if ($hasSchoolsAccessAll) {
            $requestedSchoolId = $request->input('school_id') ?? $request->query('school_id');
            
            if (is_string($requestedSchoolId) && $requestedSchoolId !== '') {
                // Validate requested school belongs to user's organization
                $requestedSchool = DB::table('school_branding')
                    ->where('id', $requestedSchoolId)
                    ->where('organization_id', $profile->organization_id)
                    ->whereNull('deleted_at')
                    ->first();
                
                if ($requestedSchool) {
                    // Use requested school for this request
                    $schoolId = $requestedSchoolId;
                } else {
                    // Invalid school requested, fall back to default
                    Log::warning('User with schools_access_all requested invalid school', [
                        'user_id' => $user->id,
                        'requested_school_id' => $requestedSchoolId,
                        'organization_id' => $profile->organization_id,
                    ]);
                }
            }
        }

        // Add school context to request for easy access in controllers
        $request->merge([
            'current_school_id' => $schoolId,
        ]);

        // Defense-in-depth: prevent clients from selecting a different school via request params.
        // For users without schools_access_all, block cross-school attempts.
        if (!$hasSchoolsAccessAll) {
            $requestedSchoolId = $request->input('school_id');
            if (is_string($requestedSchoolId) && $requestedSchoolId !== '' && $requestedSchoolId !== $schoolId) {
                return response()->json([
                    'error' => 'Invalid school scope',
                    'message' => 'Cannot access a different school than your current school context.',
                ], 403);
            }
        }

        return $next($request);
    }
}

