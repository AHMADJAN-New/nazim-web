<?php

namespace App\Http\Controllers\Concerns;

use Database\Seeders\PermissionSeeder;
use Illuminate\Support\Facades\DB;

trait RestrictsSchoolScopedAdmins
{
    protected function isSchoolScopedProfile(?object $profile): bool
    {
        if (! $profile) {
            return false;
        }

        $defaultSchoolId = $profile->default_school_id ?? null;
        $schoolsAccessAll = (bool) ($profile->schools_access_all ?? false);

        return ! $schoolsAccessAll && is_string($defaultSchoolId) && $defaultSchoolId !== '';
    }

    protected function isProtectedOrganizationRole(?string $roleName): bool
    {
        return $roleName === 'organization_admin';
    }

    protected function canSchoolScopedProfileManageTarget(?object $actingProfile, ?object $targetProfile): bool
    {
        if (! $actingProfile || ! $targetProfile) {
            return false;
        }

        if (! $this->isSchoolScopedProfile($actingProfile)) {
            return true;
        }

        $actingSchoolId = $actingProfile->default_school_id ?? null;
        $targetSchoolId = $targetProfile->default_school_id ?? null;

        return is_string($actingSchoolId)
            && $actingSchoolId !== ''
            && $actingSchoolId === $targetSchoolId;
    }

    protected function userHasProtectedOrganizationRole(string $userId, string $organizationId): bool
    {
        return DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_type', 'App\\Models\\User')
            ->where('model_has_roles.model_id', $userId)
            ->where('model_has_roles.organization_id', $organizationId)
            ->where('roles.organization_id', $organizationId)
            ->where('roles.guard_name', 'web')
            ->where('roles.name', 'organization_admin')
            ->exists();
    }

    protected function isSchoolAdminRestrictedPermission(?string $permissionName): bool
    {
        return PermissionSeeder::isSchoolAdminRestrictedPermission($permissionName);
    }

    protected function canAssignPermissionToSchoolAdminRole(?string $roleName, ?string $permissionName): bool
    {
        if ($roleName !== 'admin') {
            return true;
        }

        return ! $this->isSchoolAdminRestrictedPermission($permissionName);
    }

    protected function canAssignPermissionToSchoolScopedProfile(?object $targetProfile, ?string $permissionName): bool
    {
        if (! $this->isSchoolScopedProfile($targetProfile)) {
            return true;
        }

        return ! $this->isSchoolAdminRestrictedPermission($permissionName);
    }
}
