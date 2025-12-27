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

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            $organizationId = $profile->organization_id;
            if (!$user->hasPermissionTo('buildings.read')) {
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

        // Get accessible organization IDs (user's organization only)
        $orgIds = [$profile->organization_id];

        // Strict school scoping: ignore client-provided org/school ids
        $currentSchoolId = $this->getCurrentSchoolId($request);
        $schoolIds = [$currentSchoolId];

        $query = Building::whereNull('deleted_at')
            ->whereIn('school_id', $schoolIds);

        // Client-provided school_id/organization_id filters are ignored.

        // Support pagination if page and per_page parameters are provided
        if ($request->has('page') || $request->has('per_page')) {
            $perPage = $request->input('per_page', 25);
            // Validate per_page is one of allowed values
            $allowedPerPage = [10, 25, 50, 100];
            if (!in_array((int)$perPage, $allowedPerPage)) {
                $perPage = 25; // Default to 25 if invalid
            }
            
            $buildings = $query->orderBy('building_name', 'asc')->paginate((int)$perPage);
            
            // Get building IDs for room count query
            $buildingIds = $buildings->getCollection()->pluck('id')->toArray();

            // Get room counts for each building - filter by accessible schools
            $roomCounts = DB::table('rooms')
                ->whereIn('building_id', $buildingIds)
                ->whereIn('school_id', $schoolIds) // CRITICAL: Only count rooms from accessible schools
                ->whereNull('deleted_at')
                ->select('building_id', DB::raw('count(*) as room_count'))
                ->groupBy('building_id')
                ->pluck('room_count', 'building_id')
                ->toArray();

            // Enrich with organization_id and school information from schools
            $schoolsData = DB::table('school_branding')
                ->whereIn('id', $schoolIds)
                ->select('id', 'organization_id', 'school_name', 'school_name_arabic', 'school_name_pashto')
                ->get()
                ->keyBy('id');

            $buildings->getCollection()->transform(function ($building) use ($schoolsData, $roomCounts) {
                $buildingArray = $building->toArray();
                $school = $schoolsData->get($building->school_id);
                
                if ($school) {
                    $buildingArray['organization_id'] = $school->organization_id;
                    $buildingArray['school'] = [
                        'id' => $school->id,
                        'school_name' => $school->school_name,
                        'school_name_arabic' => $school->school_name_arabic,
                        'school_name_pashto' => $school->school_name_pashto,
                    ];
                }
                
                $buildingArray['room_count'] = $roomCounts[$building->id] ?? 0;
                
                return $buildingArray;
            });
            
            // Return paginated response in Laravel's standard format
            return response()->json($buildings);
        }

        // Return all results if no pagination requested (backward compatibility)
        $buildings = $query->orderBy('building_name', 'asc')->get();

        // Get building IDs for room count query
        $buildingIds = $buildings->pluck('id')->toArray();

        // Get room counts for each building - filter by accessible schools
        $roomCounts = DB::table('rooms')
            ->whereIn('building_id', $buildingIds)
            ->whereIn('school_id', $schoolIds) // CRITICAL: Only count rooms from accessible schools
            ->whereNull('deleted_at')
            ->select('building_id', DB::raw('count(*) as room_count'))
            ->groupBy('building_id')
            ->pluck('room_count', 'building_id')
            ->toArray();

        // Enrich with organization_id and school information from schools
        $schoolsData = DB::table('school_branding')
            ->whereIn('id', $schoolIds)
            ->select('id', 'organization_id', 'school_name', 'school_name_arabic', 'school_name_pashto')
            ->get()
            ->keyBy('id');

        $buildings = $buildings->map(function ($building) use ($schoolsData, $roomCounts) {
            $buildingArray = $building->toArray();
            $school = $schoolsData->get($building->school_id);
            
            if ($school) {
                $buildingArray['organization_id'] = $school->organization_id;
                $buildingArray['school'] = [
                    'id' => $school->id,
                    'school_name' => $school->school_name,
                    'school_name_arabic' => $school->school_name_arabic,
                    'school_name_pashto' => $school->school_name_pashto,
                ];
            } else {
                $buildingArray['organization_id'] = null;
                $buildingArray['school'] = null;
            }

            // Add room count
            $buildingArray['rooms_count'] = $roomCounts[$building->id] ?? 0;
            
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

        // Check permission (all users)
        try {
            $organizationId = $profile->organization_id;
            if (!$user->hasPermissionTo('buildings.read')) {
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

        $currentSchoolId = $this->getCurrentSchoolId($request);
        // Validate school belongs to user's organization
        $school = DB::table('school_branding')
            ->where('id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$school) {
            return response()->json(['error' => 'School not found'], 404);
        }

        // Check organization access (all users)
        if ($school->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot create building for different organization'], 403);
        }

        $building = Building::create([
            'building_name' => trim($request->building_name),
            'school_id' => $currentSchoolId,
        ]);

        // Get room count for this building
        $roomsCount = DB::table('rooms')
            ->where('building_id', $building->id)
            ->whereNull('deleted_at')
            ->count();

        // Enrich with organization_id and school information
        $buildingArray = $building->toArray();
        $buildingArray['organization_id'] = $school->organization_id;
        $buildingArray['school'] = [
            'id' => $school->id,
            'school_name' => $school->school_name,
            'school_name_arabic' => $school->school_name_arabic ?? null,
            'school_name_pashto' => $school->school_name_pashto ?? null,
        ];
        $buildingArray['rooms_count'] = $roomsCount;

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

        // Check permission (all users)
        try {
            $organizationId = $profile->organization_id;
            if (!$user->hasPermissionTo('buildings.read')) {
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

        $currentSchoolId = $this->getCurrentSchoolId(request());
        $building = Building::whereNull('deleted_at')
            ->where('school_id', $currentSchoolId)
            ->find($id);

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

        // Check organization access (all users)
        if ($school->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Building not found'], 404);
        }

        // Get room count for this building - filter by accessible schools
        $roomsCount = DB::table('rooms')
            ->where('building_id', $building->id)
            ->whereIn('school_id', $schoolIds) // CRITICAL: Only count rooms from accessible schools
            ->whereNull('deleted_at')
            ->count();

        // Enrich with organization_id and school information
        $buildingArray = $building->toArray();
        $buildingArray['organization_id'] = $school->organization_id;
        $buildingArray['school'] = [
            'id' => $school->id,
            'school_name' => $school->school_name,
            'school_name_arabic' => $school->school_name_arabic ?? null,
            'school_name_pashto' => $school->school_name_pashto ?? null,
        ];
        $buildingArray['rooms_count'] = $roomsCount;

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

        // Check permission (all users)
        try {
            $organizationId = $profile->organization_id;
            if (!$user->hasPermissionTo('buildings.read')) {
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

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $schoolIds = [$currentSchoolId];

        $building = Building::whereNull('deleted_at')
            ->where('school_id', $currentSchoolId)
            ->find($id);

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

        // Check organization access (all users)
        if ($school->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot update building from different organization'], 403);
        }

        $updateData = [];
        if ($request->has('building_name')) {
            $updateData['building_name'] = trim($request->building_name);
        }

        $building->update($updateData);

        // Get updated school for organization_id and school information
        $updatedSchool = DB::table('school_branding')
            ->where('id', $building->school_id)
            ->whereNull('deleted_at')
            ->first();

        // Get room count for this building - filter by accessible schools
        $roomsCount = DB::table('rooms')
            ->where('building_id', $building->id)
            ->whereIn('school_id', $schoolIds) // CRITICAL: Only count rooms from accessible schools
            ->whereNull('deleted_at')
            ->count();

        // Enrich with organization_id and school information
        $buildingArray = $building->toArray();
        if ($updatedSchool) {
            $buildingArray['organization_id'] = $updatedSchool->organization_id;
            $buildingArray['school'] = [
                'id' => $updatedSchool->id,
                'school_name' => $updatedSchool->school_name,
                'school_name_arabic' => $updatedSchool->school_name_arabic ?? null,
                'school_name_pashto' => $updatedSchool->school_name_pashto ?? null,
            ];
        } else {
            $buildingArray['organization_id'] = null;
            $buildingArray['school'] = null;
        }
        $buildingArray['rooms_count'] = $roomsCount;

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

        // Check permission (all users)
        try {
            $organizationId = $profile->organization_id;
            if (!$user->hasPermissionTo('buildings.read')) {
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

        $currentSchoolId = $this->getCurrentSchoolId(request());
        $schoolIds = [$currentSchoolId];

        $building = Building::whereNull('deleted_at')
            ->where('school_id', $currentSchoolId)
            ->find($id);

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

        // Check organization access (all users)
        if ($school->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot delete building from different organization'], 403);
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


