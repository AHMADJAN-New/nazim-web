<?php

namespace App\Http\Controllers;

use App\Models\User;
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

    /**
     * Check if user has a specific permission in their organization
     * This method manually queries permissions via roles, bypassing Spatie's hasPermissionTo()
     * which doesn't work correctly with teams feature
     * 
     * @param \App\Models\User $user The user to check
     * @param string $permissionName The permission name to check (e.g., 'organizations.read')
     * @param string $organizationId The organization ID to check permissions in
     * @return bool True if user has the permission, false otherwise
     */
    protected function userHasPermission(User $user, string $permissionName, string $organizationId): bool
    {
        // Get permissions via roles (bypasses model_has_permissions)
        // Flow: model_has_roles -> role_has_permissions -> permissions
        // CRITICAL: Check both organization-scoped AND global permissions
        $hasPermission = DB::table('permissions')
            ->join('role_has_permissions', 'permissions.id', '=', 'role_has_permissions.permission_id')
            ->join('model_has_roles', function ($join) use ($user) {
                $join->on('role_has_permissions.role_id', '=', 'model_has_roles.role_id')
                     ->where('model_has_roles.model_id', '=', $user->id)
                     ->where('model_has_roles.model_type', '=', 'App\\Models\\User');
            })
            ->where('model_has_roles.organization_id', $organizationId)
            ->where(function($q) use ($organizationId) {
                $q->where('role_has_permissions.organization_id', $organizationId)
                  ->orWhereNull('role_has_permissions.organization_id'); // Allow global roles
            })
            ->where(function($q) use ($organizationId) {
                $q->where('permissions.organization_id', $organizationId)
                  ->orWhereNull('permissions.organization_id'); // Allow global permissions
            })
            ->where('permissions.name', $permissionName)
            ->where('permissions.guard_name', 'web')
            ->exists();

        // Also check direct user permissions (model_has_permissions)
        // CRITICAL: Check both organization-scoped AND global permissions
        if (!$hasPermission) {
            $tableNames = config('permission.table_names');
            $columnNames = config('permission.column_names');
            $modelHasPermissionsTable = $tableNames['model_has_permissions'] ?? 'model_has_permissions';
            $modelMorphKey = $columnNames['model_morph_key'] ?? 'model_id';

            $hasPermission = DB::table($modelHasPermissionsTable)
                ->join('permissions', $modelHasPermissionsTable . '.permission_id', '=', 'permissions.id')
                ->where($modelMorphKey, $user->id)
                ->where($modelHasPermissionsTable . '.model_type', 'App\\Models\\User')
                ->where($modelHasPermissionsTable . '.organization_id', $organizationId)
                ->where(function($q) use ($organizationId) {
                    $q->where('permissions.organization_id', $organizationId)
                      ->orWhereNull('permissions.organization_id'); // Allow global permissions
                })
                ->where('permissions.name', $permissionName)
                ->where('permissions.guard_name', 'web')
                ->exists();
        }

        return $hasPermission;
    }
}
