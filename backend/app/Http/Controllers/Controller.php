<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;

abstract class Controller
{
    /**
     * Get accessible school IDs for the current user based on:
     * - org-scoped permission: schools.access_all (if granted, returns all org schools)
     * - default_school_id (if no access_all permission, restricts to that school)
     * 
     * Priority:
     * 1. If user has 'schools.access_all' permission → all schools in organization
     * 2. Else if user has default_school_id → only that school (if belongs to org)
     * 3. Else → all schools in organization (fallback behavior)
     */
    protected function getAccessibleSchoolIds($profile): array
    {
        if (!$profile || !$profile->organization_id) {
            return [];
        }
        
        $user = auth()->user();
        
        if (!$user) {
            return [];
        }
        
        // Ensure organization context is set for Spatie permissions
        // This should already be set by middleware, but ensure it's set here too
        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }
        
        // 1) Check if user has org-scoped 'schools.access_all' permission
        // Use hasPermissionTo() (Spatie) instead of can() (Laravel authorization)
        try {
            if ($user->hasPermissionTo('schools.access_all')) {
                // User has permission - return all schools in organization
                $allSchools = DB::table('school_branding')
                    ->where('organization_id', $profile->organization_id)
                    ->whereNull('deleted_at')
                    ->pluck('id')
                    ->toArray();
                
                // Debug logging (remove in production)
                if (config('app.debug')) {
                    \Log::debug('User has schools.access_all permission', [
                        'user_id' => $user->id,
                        'organization_id' => $profile->organization_id,
                        'school_count' => count($allSchools),
                    ]);
                }
                
                return $allSchools;
            }
        } catch (\Exception $e) {
            // If permission check fails (e.g., permission doesn't exist), continue to default_school_id check
            // This is expected behavior - not all users will have this permission
            if (config('app.debug')) {
                \Log::debug('Permission check failed (expected if user lacks permission)', [
                    'user_id' => $user->id,
                    'permission' => 'schools.access_all',
                    'error' => $e->getMessage(),
                ]);
            }
        }
        
        // 2) User does NOT have 'schools.access_all' permission - check default_school_id
        
        // Get all schools for user's organization (for validation)
        $orgSchoolIds = DB::table('school_branding')
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->pluck('id')
            ->toArray();
        
        // If user has default_school_id, restrict to only that school
        if ($profile->default_school_id) {
            // Verify the default school belongs to user's organization (security check)
            if (in_array($profile->default_school_id, $orgSchoolIds, true)) {
                // Debug logging (remove in production)
                if (config('app.debug')) {
                    \Log::debug('User restricted to default_school_id', [
                        'user_id' => $user->id,
                        'default_school_id' => $profile->default_school_id,
                        'organization_id' => $profile->organization_id,
                    ]);
                }
                
                return [$profile->default_school_id];
            }
            // If default school doesn't belong to org, return empty (fail secure)
            if (config('app.debug')) {
                \Log::warning('User default_school_id does not belong to organization', [
                    'user_id' => $user->id,
                    'default_school_id' => $profile->default_school_id,
                    'organization_id' => $profile->organization_id,
                ]);
            }
            return [];
        }
        
        // 3) No default_school_id and no access_all permission - return all org schools (fallback)
        // This is the fallback behavior for users without restrictions
        if (config('app.debug')) {
            \Log::debug('User has no restrictions - returning all org schools (fallback)', [
                'user_id' => $user->id,
                'organization_id' => $profile->organization_id,
                'school_count' => count($orgSchoolIds),
            ]);
        }
        
        return $orgSchoolIds;
    }
}
