<?php

namespace App\Helpers;

use App\Models\User;

class ProfileHelper
{
    /**
     * Enrich profile with the user's Spatie role for their organization.
     * The profiles.role column may be null or out of date; Spatie's model_has_roles
     * is the source of truth. This ensures the frontend receives the correct role
     * for access checks (e.g. organization_admin for Organization Admin area).
     *
     * @param  User  $user  Eloquent User model (for Spatie role lookup)
     * @param  object|null  $profile  Profile stdClass from DB::table('profiles')->first()
     * @return array Profile as array with 'role' set from Spatie when available
     */
    public static function enrichWithSpatieRole(User $user, ?object $profile): array
    {
        if (! $profile) {
            return [];
        }

        $arr = (array) $profile;

        if (empty($profile->organization_id)) {
            return $arr;
        }

        try {
            setPermissionsTeamId($profile->organization_id);
            $roleName = $user->getRoleNames()->first();
            if (is_string($roleName) && $roleName !== '') {
                $arr['role'] = $roleName;
            }
        } catch (\Throwable $e) {
            // Don't break profile response if Spatie fails
            \Illuminate\Support\Facades\Log::debug('ProfileHelper::enrichWithSpatieRole: '.$e->getMessage());
        }

        return $arr;
    }
}
