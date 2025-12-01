<?php

namespace App\Http\Controllers;

use App\Models\Building;
use App\Http\Requests\StoreBuildingRequest;
use App\Http\Requests\UpdateBuildingRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BuildingController extends Controller
{
    /**
     * Display a listing of buildings
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Check permission (allow super_admin to bypass)
        if ($profile->role !== 'super_admin') {
            try {
                $organizationId = $profile->organization_id;
                if (!$user->hasPermissionTo('buildings.read', $organizationId)) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                // If permission doesn't exist, log but allow access (for migration period)
                \Log::warning('Permission check failed in BuildingController::index - allowing access', [
                    'user_id' => $user->id,
                    'permission' => 'buildings.read',
                    'error' => $e->getMessage()
                ]);
                // Allow access if permission doesn't exist (during migration)
            }
        }

        // Get accessible organization IDs
        $orgIds = [];
        if ($profile->role === 'super_admin' && $profile->organization_id === null) {
            $orgIds = DB::table('organizations')
                ->whereNull('deleted_at')
                ->pluck('id')
                ->toArray();
        } else {
            if ($profile->organization_id) {
                $orgIds = [$profile->organization_id];
            }
        }

        if (empty($orgIds)) {
            return response()->json([]);
        }

        // Get schools for accessible organizations
        $schoolIds = DB::table('school_branding')
            ->whereIn('organization_id', $orgIds)
            ->whereNull('deleted_at')
            ->pluck('id')
            ->toArray();

        if (empty($schoolIds)) {
            return response()->json([]);
        }

        $query = Building::whereNull('deleted_at')
            ->whereIn('school_id', $schoolIds);

        // Filter by school_id if provided
        if ($request->has('school_id') && $request->school_id) {
            if (in_array($request->school_id, $schoolIds)) {
                $query->where('school_id', $request->school_id);
            } else {
                return response()->json([]);
            }
    }

        // Filter by organization_id if provided
        if ($request->has('organization_id') && $request->organization_id) {
            if (in_array($request->organization_id, $orgIds)) {
                $orgSchoolIds = DB::table('school_branding')
                    ->where('organization_id', $request->organization_id)
                    ->whereNull('deleted_at')
                    ->pluck('id')
                    ->toArray();
                $query->whereIn('school_id', $orgSchoolIds);
            } else {
                return response()->json([]);
            }
        }

        $buildings = $query->orderBy('building_name', 'asc')->get();

        // Enrich with organization_id from schools
        $schoolsMap = DB::table('school_branding')
            ->whereIn('id', $schoolIds)
            ->pluck('organization_id', 'id')
            ->toArray();

        $buildings = $buildings->map(function ($building) use ($schoolsMap) {
            $buildingArray = $building->toArray();
            $buildingArray['organization_id'] = $schoolsMap[$building->school_id] ?? null;
            return $buildingArray;
        });

        return response()->json($buildings);
    }

    /**
     * Store a newly created building
     */
    public function store(StoreBuildingRequest $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Check permission (allow super_admin to bypass)
        if ($profile->role !== 'super_admin') {
            try {
                $organizationId = $profile->organization_id;
                if (!$user->hasPermissionTo('buildings.create', $organizationId)) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                // If permission doesn't exist, log but allow access (for migration period)
                \Log::warning('Permission check failed in BuildingController::store - allowing access', [
                    'user_id' => $user->id,
                    'permission' => 'buildings.create',
                    'error' => $e->getMessage()
                ]);
                // Allow access if permission doesn't exist (during migration)
            }
        }

        // Validate school belongs to user's organization
        $school = DB::table('school_branding')
            ->where('id', $request->school_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$school) {
            return response()->json(['error' => 'School not found'], 404);
        }

        // Check organization access (unless super admin)
        if ($profile->role !== 'super_admin') {
            if ($school->organization_id !== $profile->organization_id) {
                return response()->json(['error' => 'Cannot create building for different organization'], 403);
            }
        }

        $building = Building::create([
            'building_name' => trim($request->building_name),
            'school_id' => $request->school_id,
        ]);

        // Enrich with organization_id
        $buildingArray = $building->toArray();
        $buildingArray['organization_id'] = $school->organization_id;

        return response()->json($buildingArray, 201);
    }

    /**
     * Display the specified building
     */
    public function show(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
    }

        // Check permission (allow super_admin to bypass)
        if ($profile->role !== 'super_admin') {
            try {
                $organizationId = $profile->organization_id;
                if (!$user->hasPermissionTo('buildings.read', $organizationId)) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                // If permission doesn't exist, log but allow access (for migration period)
                \Log::warning('Permission check failed in BuildingController::show - allowing access', [
                    'user_id' => $user->id,
                    'permission' => 'buildings.read',
                    'error' => $e->getMessage()
                ]);
                // Allow access if permission doesn't exist (during migration)
            }
        }

        $building = Building::whereNull('deleted_at')->find($id);

        if (!$building) {
            return response()->json(['error' => 'Building not found'], 404);
        }

        // Validate organization access via school
        $school = DB::table('school_branding')
            ->where('id', $building->school_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$school) {
            return response()->json(['error' => 'Building not found'], 404);
        }

        // Check organization access (unless super admin)
        if ($profile->role !== 'super_admin') {
            if ($school->organization_id !== $profile->organization_id) {
                return response()->json(['error' => 'Building not found'], 404);
            }
        }

        // Enrich with organization_id
        $buildingArray = $building->toArray();
        $buildingArray['organization_id'] = $school->organization_id;

        return response()->json($buildingArray);
    }

    /**
     * Update the specified building
     */
    public function update(UpdateBuildingRequest $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Check permission (allow super_admin to bypass)
        if ($profile->role !== 'super_admin') {
            try {
                $organizationId = $profile->organization_id;
                if (!$user->hasPermissionTo('buildings.update', $organizationId)) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                // If permission doesn't exist, log but allow access (for migration period)
                \Log::warning('Permission check failed in BuildingController::update - allowing access', [
                    'user_id' => $user->id,
                    'permission' => 'buildings.update',
                    'error' => $e->getMessage()
                ]);
                // Allow access if permission doesn't exist (during migration)
            }
        }

        $building = Building::whereNull('deleted_at')->find($id);

        if (!$building) {
            return response()->json(['error' => 'Building not found'], 404);
    }

        // Validate organization access via school
        $school = DB::table('school_branding')
            ->where('id', $building->school_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$school) {
            return response()->json(['error' => 'Building not found'], 404);
        }

        // Check organization access (unless super admin)
        if ($profile->role !== 'super_admin') {
            if ($school->organization_id !== $profile->organization_id) {
                return response()->json(['error' => 'Cannot update building from different organization'], 403);
            }
        }

        // Prevent school_id changes (unless super admin)
        if ($request->has('school_id') && $profile->role !== 'super_admin') {
            return response()->json(['error' => 'Cannot change school_id'], 403);
        }

        // If school_id is being changed, validate new school
        if ($request->has('school_id') && $request->school_id !== $building->school_id) {
            $newSchool = DB::table('school_branding')
                ->where('id', $request->school_id)
                ->whereNull('deleted_at')
                ->first();

            if (!$newSchool) {
                return response()->json(['error' => 'School not found'], 404);
            }

            // Validate organization access for new school
            if ($profile->role !== 'super_admin') {
                if ($newSchool->organization_id !== $profile->organization_id) {
                    return response()->json(['error' => 'Cannot move building to different organization'], 403);
                }
            }
        }

        $updateData = [];
        if ($request->has('building_name')) {
            $updateData['building_name'] = trim($request->building_name);
        }
        if ($request->has('school_id')) {
            $updateData['school_id'] = $request->school_id;
        }

        $building->update($updateData);

        // Get updated school for organization_id
        $updatedSchool = DB::table('school_branding')
            ->where('id', $building->school_id)
            ->whereNull('deleted_at')
            ->first();

        // Enrich with organization_id
        $buildingArray = $building->toArray();
        $buildingArray['organization_id'] = $updatedSchool->organization_id ?? null;

        return response()->json($buildingArray);
    }

    /**
     * Remove the specified building (soft delete)
     */
    public function destroy(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Check permission (allow super_admin to bypass)
        if ($profile->role !== 'super_admin') {
            try {
                $organizationId = $profile->organization_id;
                if (!$user->hasPermissionTo('buildings.delete', $organizationId)) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                // If permission doesn't exist, log but allow access (for migration period)
                \Log::warning('Permission check failed in BuildingController::destroy - allowing access', [
                    'user_id' => $user->id,
                    'permission' => 'buildings.delete',
                    'error' => $e->getMessage()
                ]);
                // Allow access if permission doesn't exist (during migration)
            }
        }

        $building = Building::whereNull('deleted_at')->find($id);

        if (!$building) {
            return response()->json(['error' => 'Building not found'], 404);
        }

        // Validate organization access via school
        $school = DB::table('school_branding')
            ->where('id', $building->school_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$school) {
            return response()->json(['error' => 'Building not found'], 404);
        }

        // Check organization access (unless super admin)
        if ($profile->role !== 'super_admin') {
            if ($school->organization_id !== $profile->organization_id) {
                return response()->json(['error' => 'Cannot delete building from different organization'], 403);
            }
        }

        // Check if building has rooms
        $hasRooms = DB::table('rooms')
            ->where('building_id', $id)
            ->whereNull('deleted_at')
            ->exists();

        if ($hasRooms) {
            return response()->json(['error' => 'This building has rooms assigned and cannot be deleted'], 400);
        }

        $building->delete(); // Soft delete

        return response()->json(['message' => 'Building deleted successfully'], 200);
    }
}
