<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class AppController extends Controller
{
    /**
     * Bootstrap endpoint - returns all initial data needed for app startup
     * This replaces multiple API calls with a single request
     * 
     * Returns:
     * - user: Authenticated user
     * - profile: User profile
     * - permissions: User's permissions array
     * - accessibleOrganizations: Organizations user can access
     * - selectedOrganization: User's current organization
     * - dashboardCounters: Dashboard statistics
     */
    public function bootstrap(Request $request)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $organizationId = $profile->organization_id;

        // Set organization context for permissions
        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($organizationId);
        }

        // Cache key per user+org (5-15 min TTL)
        $cacheKey = "bootstrap:{$user->id}:{$organizationId}";
        
        // Try to get from cache first
        $cached = Cache::get($cacheKey);
        if ($cached !== null) {
            return response()->json($cached);
        }

        // Fetch all data in parallel
        try {
            // 1. Get user permissions
            $permissions = $this->getUserPermissions($user, $organizationId);

            // 2. Get accessible organizations
            $accessibleOrganizations = $this->getAccessibleOrganizations($profile);

            // 3. Get selected organization
            $selectedOrganization = $this->getSelectedOrganization($organizationId);

            // 4. Get dashboard counters
            $dashboardCounters = $this->getDashboardCounters($organizationId, $profile);

            // Build response
            $response = [
                'user' => [
                    'id' => $user->id,
                    'email' => $user->email,
                ],
                'profile' => $profile,
                'permissions' => $permissions,
                'accessibleOrganizations' => $accessibleOrganizations,
                'selectedOrganization' => $selectedOrganization,
                'dashboardCounters' => $dashboardCounters,
            ];

            // Cache for 5 minutes
            Cache::put($cacheKey, $response, now()->addMinutes(5));

            return response()->json($response);
        } catch (\Exception $e) {
            Log::error('AppController::bootstrap error: ' . $e->getMessage(), [
                'user_id' => $user->id,
                'organization_id' => $organizationId,
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json(['error' => 'Failed to bootstrap application'], 500);
        }
    }

    /**
     * Get user permissions - optimized query
     */
    private function getUserPermissions($user, $organizationId): array
    {
        try {
            // Use Spatie's built-in method if available (much faster)
            if (method_exists($user, 'getAllPermissions')) {
                // Set team context for Spatie
                $user->setPermissionsTeamId($organizationId);
                $permissions = $user->getAllPermissions();
                return $permissions->pluck('name')->toArray();
            }

            // Fallback to optimized raw query
            // Get role IDs first (smaller result set)
            $roleIds = DB::table('model_has_roles')
                ->where('model_id', $user->id)
                ->where('model_type', 'App\\Models\\User')
                ->where('organization_id', $organizationId)
                ->pluck('role_id')
                ->toArray();

            if (empty($roleIds)) {
                $roleIds = [-1]; // Empty array for whereIn
            }

            // Get permissions via roles (optimized - filter role_ids first)
            $rolePermissions = DB::table('permissions')
                ->join('role_has_permissions', function ($join) use ($roleIds, $organizationId) {
                    $join->on('permissions.id', '=', 'role_has_permissions.permission_id')
                         ->whereIn('role_has_permissions.role_id', $roleIds)
                         ->where(function ($q) use ($organizationId) {
                             $q->where('role_has_permissions.organization_id', $organizationId)
                               ->orWhereNull('role_has_permissions.organization_id');
                         });
                })
                ->where(function ($query) use ($organizationId) {
                    $query->whereNull('permissions.organization_id')
                          ->orWhere('permissions.organization_id', $organizationId);
                })
                ->distinct()
                ->pluck('permissions.name')
                ->toArray();

            // Get direct user permissions (per-user overrides) - optimized
            $directPermissions = DB::table('permissions')
                ->join('model_has_permissions', function ($join) use ($user, $organizationId) {
                    $join->on('permissions.id', '=', 'model_has_permissions.permission_id')
                         ->where('model_has_permissions.model_id', $user->id)
                         ->where('model_has_permissions.model_type', 'App\\Models\\User')
                         ->where(function ($q) use ($organizationId) {
                             $q->where('model_has_permissions.organization_id', $organizationId)
                               ->orWhereNull('model_has_permissions.organization_id');
                         })
                         ->whereNull('model_has_permissions.deleted_at');
                })
                ->where(function ($query) use ($organizationId) {
                    $query->whereNull('permissions.organization_id')
                          ->orWhere('permissions.organization_id', $organizationId);
                })
                ->distinct()
                ->pluck('permissions.name')
                ->toArray();

            // Merge and deduplicate (direct permissions take precedence)
            $allPermissions = array_unique(array_merge($directPermissions, $rolePermissions));

            return array_values($allPermissions);
        } catch (\Exception $e) {
            Log::warning('Error fetching user permissions in bootstrap: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Get accessible organizations
     */
    private function getAccessibleOrganizations($profile): array
    {
        try {
            if (!$profile->organization_id) {
                return [];
            }

            $orgIds = [$profile->organization_id];

            if (empty($orgIds)) {
                return [];
            }

            $organizations = DB::table('organizations')
                ->whereIn('id', $orgIds)
                ->whereNull('deleted_at')
                ->orderBy('name')
                ->get()
                ->toArray();

            return $organizations;
        } catch (\Exception $e) {
            Log::warning('Error fetching accessible organizations in bootstrap: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Get selected organization
     */
    private function getSelectedOrganization($organizationId): ?object
    {
        try {
            $organization = DB::table('organizations')
                ->where('id', $organizationId)
                ->whereNull('deleted_at')
                ->first();

            return $organization;
        } catch (\Exception $e) {
            Log::warning('Error fetching selected organization in bootstrap: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Get dashboard counters (lightweight stats only) - optimized with single query where possible
     */
    private function getDashboardCounters($organizationId, $profile): array
    {
        try {
            $schoolIds = $this->getAccessibleSchoolIds($profile);

            // Use single query for counts where possible (faster than multiple queries)
            // For students and staff, we need school filtering, so keep separate
            // For classes, rooms, buildings - can be combined but separate is clearer
            
            // Get basic counts only (not full data) - these are fast with proper indexes
            $counters = [
                'students_count' => $this->getCount('students', $organizationId, $schoolIds),
                'staff_count' => $this->getCount('staff', $organizationId, $schoolIds),
                'classes_count' => $this->getCount('classes', $organizationId),
                'rooms_count' => $this->getCount('rooms', $organizationId),
                'buildings_count' => $this->getCount('buildings', $organizationId),
            ];

            return $counters;
        } catch (\Exception $e) {
            Log::warning('Error fetching dashboard counters in bootstrap: ' . $e->getMessage());
            return [
                'students_count' => 0,
                'staff_count' => 0,
                'classes_count' => 0,
                'rooms_count' => 0,
                'buildings_count' => 0,
            ];
        }
    }

    /**
     * Get accessible school IDs for a profile
     */
    protected function getAccessibleSchoolIds($profile): array
    {
        try {
            // For now, return empty array (no school filtering)
            // Can be extended later to filter by school_id if needed
            return [];
        } catch (\Exception $e) {
            Log::warning('Error fetching accessible school IDs in bootstrap: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Get count for a table
     */
    private function getCount(string $table, string $organizationId, array $schoolIds = []): int
    {
        try {
            $query = DB::table($table)
                ->where('organization_id', $organizationId)
                ->whereNull('deleted_at');

            if (!empty($schoolIds) && in_array($table, ['students', 'staff'])) {
                $query->whereIn('school_id', $schoolIds);
            }

            return $query->count();
        } catch (\Exception $e) {
            // Table might not exist, return 0
            return 0;
        }
    }
}

