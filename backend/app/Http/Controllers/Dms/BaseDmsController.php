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
        // Set the team context for Spatie permissions
        // Note: setPermissionsTeamId() is a global helper function, not a method on User
        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        try {
            if (!$user->hasPermissionTo($permission)) {
                // Log detailed permission information for debugging
                $userRoles = DB::table('model_has_roles')
                    ->where('model_type', 'App\\Models\\User')
                    ->where('model_id', $user->id)
                    ->where('organization_id', $profile->organization_id)
                    ->pluck('role_id')
                    ->toArray();
                
                $roleNames = DB::table('roles')
                    ->whereIn('id', $userRoles)
                    ->where('organization_id', $profile->organization_id)
                    ->pluck('name')
                    ->toArray();
                
                $permissionExists = DB::table('permissions')
                    ->where('name', $permission)
                    ->where(function($query) use ($profile) {
                        $query->whereNull('organization_id')
                              ->orWhere('organization_id', $profile->organization_id);
                    })
                    ->exists();
                
                Log::warning("Permission check failed", [
                    'user_id' => $user->id,
                    'permission' => $permission,
                    'organization_id' => $profile->organization_id,
                    'user_roles' => $roleNames,
                    'permission_exists' => $permissionExists,
                ]);
                
                return response()->json([
                    'error' => 'This action is unauthorized',
                    'message' => "You need the '{$permission}' permission to perform this action.",
                    'debug' => [
                        'permission' => $permission,
                        'user_roles' => $roleNames,
                    ]
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for {$permission}: {$e->getMessage()}", [
                'user_id' => $user->id,
                'organization_id' => $profile->organization_id,
                'exception' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
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

    /**
     * Get accessible school IDs for the user.
     * Returns empty array if user has access to all schools in the organization.
     */
    protected function getAccessibleSchoolIds($profile): array
    {
        // For now, return empty array to allow access to all schools
        // This can be enhanced later with school-specific permissions
        return [];
    }
}
