<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

abstract class Controller
{
    /**
     * Get current school id injected by school.context middleware.
     * Controllers should not trust client-provided school_id.
     */
    protected function getCurrentSchoolId(Request $request): string
    {
        $schoolId = $request->get('current_school_id');
        if (!is_string($schoolId) || $schoolId === '') {
            abort(403, 'School context is required');
        }
        return $schoolId;
    }

    /**
     * Get accessible school IDs based on user's schools_access_all permission.
     * If schools_access_all is true, returns all schools in organization.
     * Otherwise, returns only the current/default school.
     */
    protected function getAccessibleSchoolIds($profile, ?Request $request = null): array
    {
        if (!$profile || !$profile->organization_id) {
            return [];
        }

        // Check if user has schools_access_all permission
        $hasSchoolsAccessAll = (bool) ($profile->schools_access_all ?? false);

        // If user has schools_access_all, return all schools in organization
        if ($hasSchoolsAccessAll) {
            $allSchools = DB::table('school_branding')
                ->where('organization_id', $profile->organization_id)
                ->whereNull('deleted_at')
                ->pluck('id')
                ->toArray();
            
            return $allSchools;
        }

        // Otherwise, strict school scoping: only current/default school
        // Prefer middleware-injected school id
        if ($request) {
            $currentSchoolId = $request->get('current_school_id');
            if (is_string($currentSchoolId) && $currentSchoolId !== '') {
                return [$currentSchoolId];
            }
        }

        // Fall back to profile default school (fail secure if missing/invalid)
        if (!$profile->default_school_id) {
            return [];
        }

        $belongs = DB::table('school_branding')
            ->where('id', $profile->default_school_id)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->exists();

        return $belongs ? [$profile->default_school_id] : [];
    }
}
