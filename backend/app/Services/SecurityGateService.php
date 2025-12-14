<?php

namespace App\Services;

use App\Models\Profile;
use App\Models\SecurityLevel;
use App\Models\User;

class SecurityGateService
{
    public function canView(User $user, string $securityLevelKey, ?string $organizationId = null): bool
    {
        $profile = $user->profile;
        $organizationId = $organizationId ?? $profile->organization_id ?? null;
        if (!$organizationId || !$profile) {
            return false;
        }

        $requiredLevel = SecurityLevel::where('organization_id', $organizationId)
            ->where('key', $securityLevelKey)
            ->where('active', true)
            ->first();

        if (!$requiredLevel) {
            return false;
        }

        $userClearanceKey = $profile->clearance_level_key ?? null;
        if (!$userClearanceKey) {
            return false;
        }

        $userLevel = SecurityLevel::where('organization_id', $organizationId)
            ->where('key', $userClearanceKey)
            ->where('active', true)
            ->first();

        if (!$userLevel) {
            return false;
        }

        return $userLevel->rank >= $requiredLevel->rank;
    }
}
