<?php

namespace App\Services;

use App\Models\OrganizationSubscription;
use Illuminate\Support\Facades\DB;

class OrganizationAdminSchoolAccessService
{
    public function organizationHasEnterprisePlan(string $organizationId): bool
    {
        $subscription = OrganizationSubscription::query()
            ->with('plan')
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->orderByDesc('created_at')
            ->first();

        return $subscription?->plan?->slug === 'enterprise';
    }

    public function shouldAutoEnableAllSchoolsForRole(string $organizationId, ?string $roleName): bool
    {
        return $roleName === 'organization_admin' && $this->organizationHasEnterprisePlan($organizationId);
    }

    public function enableAllSchoolsForUser(string $userId, string $organizationId): bool
    {
        return DB::table('profiles')
            ->where('id', $userId)
            ->where('organization_id', $organizationId)
            ->update([
                'schools_access_all' => true,
                'updated_at' => now(),
            ]) > 0;
    }

    public function enableAllSchoolsForOrganizationAdmins(string $organizationId): int
    {
        $userIds = DB::table('model_has_roles')
            ->join('roles', function ($join) use ($organizationId) {
                $join->on('roles.id', '=', 'model_has_roles.role_id')
                    ->where('roles.organization_id', '=', $organizationId)
                    ->where('roles.guard_name', '=', 'web')
                    ->where('roles.name', '=', 'organization_admin');
            })
            ->join('profiles', function ($join) use ($organizationId) {
                $join->on('profiles.id', '=', 'model_has_roles.model_id')
                    ->where('profiles.organization_id', '=', $organizationId);
            })
            ->where('model_has_roles.model_type', 'App\\Models\\User')
            ->where('model_has_roles.organization_id', $organizationId)
            ->distinct()
            ->pluck('profiles.id')
            ->all();

        if (empty($userIds)) {
            return 0;
        }

        return DB::table('profiles')
            ->where('organization_id', $organizationId)
            ->whereIn('id', $userIds)
            ->where(function ($query) {
                $query->whereNull('schools_access_all')
                    ->orWhere('schools_access_all', false);
            })
            ->update([
                'schools_access_all' => true,
                'updated_at' => now(),
            ]);
    }
}
