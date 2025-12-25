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
     * Strict school scoping: if you still need a list (rare), it is only the current school.
     */
    protected function getAccessibleSchoolIds($profile, ?Request $request = null): array
    {
        if (!$profile || !$profile->organization_id) {
            return [];
        }

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
