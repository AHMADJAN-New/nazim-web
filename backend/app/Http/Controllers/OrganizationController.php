<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrganizationController extends Controller
{
    /**
     * Display a listing of organizations
     * Public endpoint for signup form, or filtered for authenticated users
     */
    public function index(Request $request)
    {
        try {
            // Use DB facade directly to avoid Eloquent issues if table doesn't exist
            $query = DB::connection('pgsql')
                ->table('organizations')
                ->whereNull('deleted_at');

            // If user is authenticated, filter by their organization
            $user = $request->user();
            if ($user) {
                $profile = DB::connection('pgsql')
                    ->table('profiles')
                    ->where('id', $user->id)
                    ->first();
                
                if ($profile) {
                    // Super admin can see all, others see only their organization
                    if ($profile->role !== 'super_admin' || $profile->organization_id !== null) {
                        $query->where('id', $profile->organization_id);
                    }
                }
            }
            // If no user, return all active organizations (for signup form)

            $organizations = $query->orderBy('name')->get();

            return response()->json($organizations);
        } catch (\Illuminate\Database\QueryException $e) {
            \Log::error('OrganizationController::index database error: ' . $e->getMessage(), [
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
            \Log::error('OrganizationController::index error: ' . $e->getMessage(), [
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

        // Check permission: organizations.create
        // For new organizations, we check if user has the permission globally (organization_id = null)
        // Super admin can always create organizations
        if ($profile->role !== 'super_admin' || $profile->organization_id !== null) {
            if (!$user->hasPermissionTo('organizations.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
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
        $organization = Organization::whereNull('deleted_at')->findOrFail($id);
        return response()->json($organization);
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

        // Check permission: organizations.update
        // Super admin can always update organizations
        if ($profile->role !== 'super_admin' || $profile->organization_id !== null) {
            if (!$user->hasPermissionTo('organizations.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
            
            // Regular users can only update their own organization
            if ($profile->organization_id !== $organization->id) {
                return response()->json(['error' => 'Cannot update organization from different organization'], 403);
            }
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

        // Check permission: organizations.delete
        // Super admin can always delete organizations
        if ($profile->role !== 'super_admin' || $profile->organization_id !== null) {
            if (!$user->hasPermissionTo('organizations.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
            
            // Regular users can only delete their own organization
            if ($profile->organization_id !== $organization->id) {
                return response()->json(['error' => 'Cannot delete organization from different organization'], 403);
            }
        }

        $organization->update(['deleted_at' => now()]);

        return response()->json(['message' => 'Organization deleted successfully']);
    }

    /**
     * Get organization statistics
     */
    public function statistics(Request $request, string $id)
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

        // Check permission: organizations.read
        // Super admin can always view statistics
        if ($profile->role !== 'super_admin' || $profile->organization_id !== null) {
            if (!$user->hasPermissionTo('organizations.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
            
            // Regular users can only view their own organization's statistics
            if ($profile->organization_id !== $organization->id) {
                return response()->json(['error' => 'Cannot view statistics for different organization'], 403);
            }
        }

        // Get statistics
        $userCount = DB::connection('pgsql')
            ->table('profiles')
            ->where('organization_id', $id)
            ->whereNull('deleted_at')
            ->count();

        $buildingCount = DB::connection('pgsql')
            ->table('buildings')
            ->where('organization_id', $id)
            ->whereNull('deleted_at')
            ->count();

        $roomCount = DB::connection('pgsql')
            ->table('rooms')
            ->where('organization_id', $id)
            ->whereNull('deleted_at')
            ->count();

        return response()->json([
            'userCount' => $userCount,
            'buildingCount' => $buildingCount,
            'roomCount' => $roomCount,
        ]);
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

            // Super admin can access all organizations
            if ($profile->role === 'super_admin' && $profile->organization_id === null) {
                $organizations = DB::connection('pgsql')
                    ->table('organizations')
                    ->whereNull('deleted_at')
                    ->orderBy('name')
                    ->get();
            } else {
                // Get user's organization and any organizations they're assigned to
                $orgIds = [];
                
                if ($profile->organization_id) {
                    $orgIds[] = $profile->organization_id;
                }
                
                // Check super_admin_organizations table if it exists
                try {
                    $assignedOrgs = DB::connection('pgsql')
                        ->table('super_admin_organizations')
                        ->where('super_admin_id', $user->id)
                        ->pluck('organization_id')
                        ->toArray();
                    
                    $orgIds = array_merge($orgIds, $assignedOrgs);
                } catch (\Exception $e) {
                    // Table might not exist, ignore
                }
                
                $orgIds = array_filter(array_unique($orgIds));

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
            }

            return response()->json($organizations);
        } catch (\Exception $e) {
            \Log::error('OrganizationController::accessible error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to fetch accessible organizations'], 500);
        }
    }
}
