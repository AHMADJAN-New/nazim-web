<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OrganizationController extends Controller
{
    /**
     * Display a listing of organizations (protected - requires authentication)
     * Returns organizations filtered by user's access
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json(['error' => 'Unauthenticated'], 401);
            }

            $profile = DB::connection('pgsql')
                ->table('profiles')
                ->where('id', $user->id)
                ->first();

            if (!$profile) {
                return response()->json(['error' => 'Profile not found'], 404);
            }

            // Require organization_id for all users
            if (!$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            // Check permission - context already set by middleware
            if (!$user->hasPermissionTo('organizations.read')) {
                Log::warning("Permission denied for organizations.read", [
                    'user_id' => $user->id,
                    'organization_id' => $profile->organization_id,
                    'team_id' => getPermissionsTeamId(),
                ]);
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'You do not have permission to access this resource.',
                    'required_permission' => 'organizations.read'
                ], 403);
            }

            // Use DB facade directly to avoid Eloquent issues if table doesn't exist
            $query = DB::connection('pgsql')
                ->table('organizations')
                ->whereNull('deleted_at');

            // All users see only their organization
            $query->where('id', $profile->organization_id);

            $organizations = $query->orderBy('name')->get();

            return response()->json($organizations);
        } catch (\Illuminate\Database\QueryException $e) {
            Log::error('OrganizationController::index database error: ' . $e->getMessage(), [
                'sql' => $e->getSql(),
                'bindings' => $e->getBindings(),
                'trace' => $e->getTraceAsString()
            ]);

            // If table doesn't exist, return empty array instead of error
            if (str_contains($e->getMessage(), 'does not exist') || str_contains($e->getMessage(), 'relation')) {
                return response()->json([]);
            }

            return response()->json(['error' => 'Failed to fetch organizations'], 500);
        } catch (\Exception $e) {
            Log::error('OrganizationController::index error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to fetch organizations'], 500);
        }
    }

    /**
     * Public endpoint for signup form - returns minimal organization data only
     * Returns only id, name, and slug (no sensitive settings or other data)
     */
    public function publicList(Request $request)
    {
        try {
            // Use DB facade directly to avoid Eloquent issues if table doesn't exist
            $organizations = DB::connection('pgsql')
                ->table('organizations')
                ->whereNull('deleted_at')
                ->select('id', 'name', 'slug') // Only return minimal data needed for signup
                ->orderBy('name')
                ->get();

            return response()->json($organizations);
        } catch (\Illuminate\Database\QueryException $e) {
            Log::error('OrganizationController::publicList database error: ' . $e->getMessage(), [
                'sql' => $e->getSql(),
                'bindings' => $e->getBindings(),
                'trace' => $e->getTraceAsString()
            ]);

            // If table doesn't exist, return empty array instead of error
            if (str_contains($e->getMessage(), 'does not exist') || str_contains($e->getMessage(), 'relation')) {
                return response()->json([]);
            }

            return response()->json(['error' => 'Failed to fetch organizations'], 500);
        } catch (\Exception $e) {
            Log::error('OrganizationController::publicList error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to fetch organizations'], 500);
        }
    }

    /**
     * Store a newly created organization
     */
    public function store(Request $request)
    {
        $user = $request->user();
        $profile = DB::connection('pgsql')
            ->table('profiles')
            ->where('id', $user->id)
            ->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission - context already set by middleware
        if (!$user->hasPermissionTo('organizations.create')) {
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'You do not have permission to access this resource.',
                'required_permission' => 'organizations.create'
            ], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:organizations,slug',
            'settings' => 'nullable|array',
        ]);

        $organization = Organization::create([
            'name' => $request->name,
            'slug' => $request->slug,
            'settings' => $request->settings ?? [],
        ]);

        return response()->json($organization, 201);
    }

    /**
     * Display the specified organization
     */
    public function show(string $id)
    {
        try {
            $user = request()->user();

            if (!$user) {
                return response()->json(['error' => 'Unauthenticated'], 401);
            }

            $profile = DB::connection('pgsql')
                ->table('profiles')
                ->where('id', $user->id)
                ->first();

            if (!$profile) {
                return response()->json(['error' => 'Profile not found'], 404);
            }

            // Require organization_id for all users
            if (!$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            // Check permission - context already set by middleware
            try {
                if (!$user->hasPermissionTo('organizations.read')) {
                    return response()->json([
                        'error' => 'Access Denied',
                        'message' => 'You do not have permission to access this resource.',
                        'required_permission' => 'organizations.read'
                    ], 403);
                }
            } catch (\Exception $e) {
                Log::warning("Permission check failed for organizations.read: " . $e->getMessage());
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'You do not have permission to access this resource.',
                    'required_permission' => 'organizations.read'
                ], 403);
            }

            $organization = Organization::whereNull('deleted_at')->find($id);

            if (!$organization) {
                return response()->json(['error' => 'Organization not found'], 404);
            }

            // All users can only view their own organization
            if ($profile->organization_id !== $organization->id) {
                return response()->json(['error' => 'Organization not found'], 404);
            }

            return response()->json($organization);
        } catch (\Illuminate\Database\QueryException $e) {
            Log::error('OrganizationController::show database error: ' . $e->getMessage(), [
                'sql' => $e->getSql(),
                'bindings' => $e->getBindings(),
                'trace' => $e->getTraceAsString(),
                'id' => $id
            ]);

            return response()->json(['error' => 'Failed to fetch organization'], 500);
        } catch (\Exception $e) {
            Log::error('OrganizationController::show error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'id' => $id
            ]);

            return response()->json([
                'error' => 'Failed to fetch organization',
                'message' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Update the specified organization
     */
    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::connection('pgsql')
            ->table('profiles')
            ->where('id', $user->id)
            ->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $organization = Organization::whereNull('deleted_at')->findOrFail($id);

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission - context already set by middleware
        if (!$user->hasPermissionTo('organizations.update')) {
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'You do not have permission to access this resource.',
                'required_permission' => 'organizations.update'
            ], 403);
        }

        // All users can only update their own organization
        if ($profile->organization_id !== $organization->id) {
            return response()->json(['error' => 'Cannot update organization from different organization'], 403);
        }

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|max:255|unique:organizations,slug,' . $id,
            'settings' => 'nullable|array',
        ]);

        $organization->update($request->only(['name', 'slug', 'settings']));

        return response()->json($organization);
    }

    /**
     * Remove the specified organization (soft delete)
     */
    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::connection('pgsql')
            ->table('profiles')
            ->where('id', $user->id)
            ->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $organization = Organization::findOrFail($id);

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission - context already set by middleware
        if (!$user->hasPermissionTo('organizations.delete')) {
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'You do not have permission to access this resource.',
                'required_permission' => 'organizations.delete'
            ], 403);
        }

        // All users can only delete their own organization
        if ($profile->organization_id !== $organization->id) {
            return response()->json(['error' => 'Cannot delete organization from different organization'], 403);
        }

        $organization->update(['deleted_at' => now()]);

        return response()->json(['message' => 'Organization deleted successfully']);
    }

    /**
     * Get organization statistics
     */
    public function statistics(Request $request, string $id)
    {
        try {
            $user = $request->user();
            $profile = DB::connection('pgsql')
                ->table('profiles')
                ->where('id', $user->id)
                ->first();

            if (!$profile) {
                return response()->json(['error' => 'Profile not found'], 404);
            }

            $organization = Organization::whereNull('deleted_at')->findOrFail($id);

            // Require organization_id for all users
            if (!$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            // Check permission - context already set by middleware
            try {
                if (!$user->hasPermissionTo('organizations.read')) {
                    return response()->json([
                        'error' => 'Access Denied',
                        'message' => 'You do not have permission to access this resource.',
                        'required_permission' => 'organizations.read'
                    ], 403);
                }
            } catch (\Exception $e) {
                Log::warning("Permission check failed for organizations.read in statistics: " . $e->getMessage());
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'You do not have permission to access this resource.',
                ], 403);
            }

            // All users can only view their own organization's statistics
            if ($profile->organization_id !== $organization->id) {
                return response()->json(['error' => 'Cannot view statistics for different organization'], 403);
            }

            // Get statistics
            $userCount = DB::connection('pgsql')
                ->table('profiles')
                ->where('organization_id', $id)
                ->whereNull('deleted_at')
                ->count();

            // Schools count (direct organization_id)
            $schoolCount = DB::connection('pgsql')
                ->table('school_branding')
                ->where('organization_id', $id)
                ->whereNull('deleted_at')
                ->count();

            // Students count (direct organization_id)
            $studentCount = DB::connection('pgsql')
                ->table('students')
                ->where('organization_id', $id)
                ->whereNull('deleted_at')
                ->count();

            // Classes count (direct organization_id)
            $classCount = DB::connection('pgsql')
                ->table('classes')
                ->where('organization_id', $id)
                ->whereNull('deleted_at')
                ->count();

            // Staff count (direct organization_id)
            $staffCount = DB::connection('pgsql')
                ->table('staff')
                ->where('organization_id', $id)
                ->whereNull('deleted_at')
                ->count();

            // Buildings are linked to organizations through schools
            // Get school IDs for this organization first
            $schoolIds = DB::connection('pgsql')
                ->table('school_branding')
                ->where('organization_id', $id)
                ->whereNull('deleted_at')
                ->pluck('id')
                ->toArray();

            $buildingCount = 0;
            if (!empty($schoolIds)) {
                $buildingCount = DB::connection('pgsql')
                    ->table('buildings')
                    ->whereIn('school_id', $schoolIds)
                    ->whereNull('deleted_at')
                    ->count();
            }

            // Rooms are linked to organizations through schools
            $roomCount = 0;
            if (!empty($schoolIds)) {
                $roomCount = DB::connection('pgsql')
                    ->table('rooms')
                    ->whereIn('school_id', $schoolIds)
                    ->whereNull('deleted_at')
                    ->count();
            }

            return response()->json([
                'userCount' => $userCount,
                'schoolCount' => $schoolCount,
                'studentCount' => $studentCount,
                'classCount' => $classCount,
                'staffCount' => $staffCount,
                'buildingCount' => $buildingCount,
                'roomCount' => $roomCount,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['error' => 'Organization not found'], 404);
        } catch (\Exception $e) {
            Log::error('OrganizationController::statistics error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'organization_id' => $id,
            ]);
            return response()->json(['error' => 'Failed to fetch organization statistics'], 500);
        }
    }

    /**
     * Get accessible organizations for the user
     */
    public function accessible(Request $request)
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json(['error' => 'Unauthenticated'], 401);
            }

            $profile = DB::connection('pgsql')
                ->table('profiles')
                ->where('id', $user->id)
                ->first();

            if (!$profile) {
                return response()->json([]);
            }

            // Require organization_id for all users
            if (!$profile->organization_id) {
                return response()->json([]);
            }

            // Get user's organization
            $orgIds = [$profile->organization_id];

            if (empty($orgIds)) {
                $organizations = collect([]);
            } else {
                $organizations = DB::connection('pgsql')
                    ->table('organizations')
                    ->whereIn('id', $orgIds)
                    ->whereNull('deleted_at')
                    ->orderBy('name')
                    ->get();
            }

            return response()->json($organizations);
        } catch (\Exception $e) {
            Log::error('OrganizationController::accessible error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to fetch accessible organizations'], 500);
        }
    }
}

