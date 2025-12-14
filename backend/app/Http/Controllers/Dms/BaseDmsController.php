<?php

namespace App\Http\Controllers\Dms;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

abstract class BaseDmsController extends Controller
{
    use AuthorizesRequests;

    protected function requireOrganizationContext(Request $request, string $permission): JsonResponse|array
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Scope Spatie permissions to the organization
        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        try {
            if (!$user->hasPermissionTo($permission)) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for {$permission}: {$e->getMessage()}");
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $schoolIds = $this->getAccessibleSchoolIds($profile);

        return [$user, $profile, $schoolIds];
    }

    protected function userClearanceRank($user, string $organizationId): int
    {
        $profile = $user->profile;
        if (!$profile?->clearance_level_key) {
            return 0;
        }

        $level = DB::table('security_levels')
            ->where('organization_id', $organizationId)
            ->where('key', $profile->clearance_level_key)
            ->first();

        return $level?->rank ?? 0;
    }

    protected function ensureSchoolAccess(?string $schoolId, array $schoolIds): ?JsonResponse
    {
        if (empty($schoolIds) || !$schoolId) {
            return null;
        }

        if (!in_array($schoolId, $schoolIds, true)) {
            return response()->json(['error' => 'School not accessible for this user'], 403);
        }

        return null;
    }
}
