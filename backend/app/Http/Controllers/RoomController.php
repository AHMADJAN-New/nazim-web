<?php

namespace App\Http\Controllers;

use App\Models\Room;
use App\Http\Requests\StoreRoomRequest;
use App\Http\Requests\UpdateRoomRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class RoomController extends Controller
{
    /**
     * Display a listing of rooms
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

        // Ensure organization context is set for Spatie permissions
        // The 'organization' middleware should handle this, but we set it explicitly for safety
        if (method_exists($user, 'setPermissionsTeamId')) {
            $user->setPermissionsTeamId($profile->organization_id);
        }

        // Check permission WITH organization context
        try {
            if (!$this->userHasPermission($user, 'rooms.read', $profile->organization_id)) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for rooms.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Get accessible organization IDs (user's organization only)
        $orgIds = [$profile->organization_id];

        // Strict school scoping
        $currentSchoolId = $this->getCurrentSchoolId($request);
        $schoolIds = [$currentSchoolId];

        $query = Room::whereNull('deleted_at')
            ->whereIn('school_id', $schoolIds);

        // Client-provided school_id is ignored; current school is enforced.

        // Filter by building_id if provided - validate building belongs to accessible school
        if ($request->has('building_id') && $request->building_id) {
            // Validate building belongs to an accessible school
            $building = DB::table('buildings')
                ->where('id', $request->building_id)
                ->whereNull('deleted_at')
                ->first();
            
            if (!$building) {
                return response()->json(['error' => 'Building not found'], 404);
            }
            
            // Check if building's school_id is in accessible schools
            if (!in_array($building->school_id, $schoolIds)) {
                return response()->json(['error' => 'Building not accessible'], 403);
            }
            
            $query->where('building_id', $request->building_id);
        }

        // Client-provided organization_id is ignored; organization is derived from profile.

        // Support pagination if page and per_page parameters are provided
        if ($request->has('page') || $request->has('per_page')) {
            $perPage = $request->input('per_page', 25);
            // Validate per_page is one of allowed values
            $allowedPerPage = [10, 25, 50, 100];
            if (!in_array((int)$perPage, $allowedPerPage)) {
                $perPage = 25; // Default to 25 if invalid
            }
            
            $rooms = $query->orderBy('room_number', 'asc')->paginate((int)$perPage);
            
            // Return paginated response in Laravel's standard format
            return response()->json($rooms);
        }

        // Return all results if no pagination requested (backward compatibility)
        $rooms = $query->orderBy('room_number', 'asc')->get();

        // Get building IDs and staff IDs for relationships
        $buildingIds = $rooms->pluck('building_id')->filter()->unique()->toArray();
        $staffIds = $rooms->pluck('staff_id')->filter()->unique()->toArray();

        // Fetch buildings - filter by accessible schools
        $buildings = [];
        if (!empty($buildingIds)) {
            $buildings = DB::table('buildings')
                ->whereIn('id', $buildingIds)
                ->whereIn('school_id', $schoolIds) // CRITICAL: Only fetch buildings from accessible schools
                ->whereNull('deleted_at')
                ->get()
                ->keyBy('id')
                ->toArray();
        }

        // Fetch staff and profiles
        $staffMap = [];
        if (!empty($staffIds) && Schema::hasTable('staff')) {
            $staffList = DB::table('staff')
                ->whereIn('id', $staffIds)
                ->whereNull('deleted_at')
                ->get();

            $profileIds = $staffList->pluck('profile_id')
                ->filter(function ($id) {
                    // Filter out null, empty strings, 0, and ensure it's a valid UUID-like string
                    return !empty($id) && $id !== '0' && $id !== 0 && is_string($id);
                })
                ->unique()
                ->values()
                ->toArray();
            $profiles = [];
            if (!empty($profileIds)) {
                $profiles = DB::table('profiles')
                    ->whereIn('id', $profileIds)
                    ->get()
                    ->keyBy('id')
                    ->toArray();
            }

            foreach ($staffList as $staff) {
                $staffProfile = null;
                if (!empty($staff->profile_id) && isset($profiles[$staff->profile_id])) {
                    $staffProfile = [
                        'full_name' => $profiles[$staff->profile_id]->full_name ?? null,
                    ];
                }

                $staffMap[$staff->id] = [
                    'id' => $staff->id,
                    'profile' => $staffProfile,
                ];
            }
        }

        // Enrich rooms with relationships
        $rooms = $rooms->map(function ($room) use ($buildings, $staffMap) {
            $roomArray = $room->toArray();

            // Add building relationship
            $building = $buildings[$room->building_id] ?? null;
            $roomArray['building'] = $building ? [
                'id' => $building->id,
                'building_name' => $building->building_name,
                'school_id' => $building->school_id,
            ] : null;

            // Add staff relationship
            $roomArray['staff'] = isset($staffMap[$room->staff_id]) ? $staffMap[$room->staff_id] : null;

            return $roomArray;
        });

        return response()->json($rooms);
    }

    /**
     * Store a newly created room
     */
    public function store(StoreRoomRequest $request)
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

        // Ensure organization context is set for Spatie permissions
        if (method_exists($user, 'setPermissionsTeamId')) {
            $user->setPermissionsTeamId($profile->organization_id);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('rooms.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for rooms.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $schoolIds = [$currentSchoolId];

        // Get building to verify school and get school_id
        $building = DB::table('buildings')
            ->where('id', $request->building_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$building) {
            return response()->json(['error' => 'Building not found'], 404);
        }

        // Validate building belongs to accessible school
        if (!in_array($building->school_id, $schoolIds)) {
            return response()->json(['error' => 'Building does not belong to an accessible school'], 403);
        }

        // Validate building belongs to user's organization (double-check)
        $school = DB::table('school_branding')
            ->where('id', $building->school_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$school) {
            return response()->json(['error' => 'Building does not belong to an accessible school'], 404);
        }

        // Check organization access (all users)
        if ($school->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Building does not belong to an accessible organization'], 403);
        }

        $room = Room::create([
            'room_number' => trim($request->room_number),
            'building_id' => $request->building_id,
            'school_id' => $building->school_id, // Inherit from building
            'staff_id' => $request->staff_id ?? null,
        ]);

        // Enrich with relationships
        $roomArray = $room->toArray();
        $roomArray['building'] = [
            'id' => $building->id,
            'building_name' => $building->building_name,
            'school_id' => $building->school_id,
        ];

        // Add staff if provided
        if (!empty($room->staff_id) && Schema::hasTable('staff')) {
            $staff = DB::table('staff')
                ->where('id', $room->staff_id)
                ->whereNull('deleted_at')
                ->first();

            if ($staff) {
                $staffProfile = null;
                if (!empty($staff->profile_id) && $staff->profile_id !== '0' && $staff->profile_id !== 0) {
                    $staffProfile = DB::table('profiles')
                        ->where('id', $staff->profile_id)
                        ->first();
                }

                $roomArray['staff'] = [
                    'id' => $staff->id,
                    'profile' => $staffProfile ? [
                        'full_name' => $staffProfile->full_name ?? null,
                    ] : null,
                ];
            } else {
                $roomArray['staff'] = null;
            }
        } else {
            $roomArray['staff'] = null;
        }

        return response()->json($roomArray, 201);
    }

    /**
     * Display the specified room
     */
    public function show(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Ensure organization context is set for Spatie permissions
        // The 'organization' middleware should handle this, but we set it explicitly for safety
        if (method_exists($user, 'setPermissionsTeamId')) {
            $user->setPermissionsTeamId($profile->organization_id);
        }

        // Check permission WITH organization context
        try {
            if (!$this->userHasPermission($user, 'rooms.read', $profile->organization_id)) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for rooms.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId(request());
        $schoolIds = [$currentSchoolId];

        $room = Room::whereNull('deleted_at')->find($id);

        if (!$room) {
            return response()->json(['error' => 'Room not found'], 404);
        }

        // Validate room belongs to accessible school
        if (!in_array($room->school_id, $schoolIds)) {
            return response()->json(['error' => 'Room not found'], 404);
        }

        // Validate organization access via school
        $school = DB::table('school_branding')
            ->where('id', $room->school_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$school) {
            return response()->json(['error' => 'Room not found'], 404);
        }

        // Check organization access (all users)
        if ($school->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Room not found'], 404);
        }

        // Enrich with relationships
        $roomArray = $room->toArray();

        // Add building
        $building = DB::table('buildings')
            ->where('id', $room->building_id)
            ->whereNull('deleted_at')
            ->first();

        $roomArray['building'] = $building ? [
            'id' => $building->id,
            'building_name' => $building->building_name,
            'school_id' => $building->school_id,
        ] : null;

        // Add staff
        if (!empty($room->staff_id) && Schema::hasTable('staff')) {
            $staff = DB::table('staff')
                ->where('id', $room->staff_id)
                ->whereNull('deleted_at')
                ->first();

            if ($staff) {
                $staffProfile = null;
                if (!empty($staff->profile_id) && $staff->profile_id !== '0' && $staff->profile_id !== 0) {
                    $staffProfile = DB::table('profiles')
                        ->where('id', $staff->profile_id)
                        ->first();
                }

                $roomArray['staff'] = [
                    'id' => $staff->id,
                    'profile' => $staffProfile ? [
                        'full_name' => $staffProfile->full_name ?? null,
                    ] : null,
                ];
            } else {
                $roomArray['staff'] = null;
            }
        } else {
            $roomArray['staff'] = null;
        }

        return response()->json($roomArray);
    }

    /**
     * Update the specified room
     */
    public function update(UpdateRoomRequest $request, string $id)
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

        // Ensure organization context is set for Spatie permissions
        if (method_exists($user, 'setPermissionsTeamId')) {
            $user->setPermissionsTeamId($profile->organization_id);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('rooms.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for rooms.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $schoolIds = [$currentSchoolId];

        $room = Room::whereNull('deleted_at')->find($id);

        if (!$room) {
            return response()->json(['error' => 'Room not found'], 404);
        }

        // Validate room belongs to accessible school
        if (!in_array($room->school_id, $schoolIds)) {
            return response()->json(['error' => 'Room not found'], 404);
        }

        // Validate organization access via school
        $school = DB::table('school_branding')
            ->where('id', $room->school_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$school) {
            return response()->json(['error' => 'Room not found'], 404);
        }

        // Check organization access (all users)
        if ($school->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot update room from different organization'], 403);
        }

        // If building_id is being changed, validate new building and update school_id
        $newSchoolId = $room->school_id;
        if ($request->has('building_id') && $request->building_id !== $room->building_id) {
            $newBuilding = DB::table('buildings')
                ->where('id', $request->building_id)
                ->whereNull('deleted_at')
                ->first();

            if (!$newBuilding) {
                return response()->json(['error' => 'Building not found'], 404);
            }

            // Validate new building belongs to accessible school
            if (!in_array($newBuilding->school_id, $schoolIds)) {
                return response()->json(['error' => 'Building does not belong to an accessible school'], 403);
            }

            // Validate new building belongs to user's organization
            $newBuildingSchool = DB::table('school_branding')
                ->where('id', $newBuilding->school_id)
                ->whereNull('deleted_at')
                ->first();

            if (!$newBuildingSchool) {
                return response()->json(['error' => 'Building does not belong to an accessible school'], 404);
            }

            // Check organization access for new building (all users)
            if ($newBuildingSchool->organization_id !== $profile->organization_id) {
                return response()->json(['error' => 'Cannot move room to different organization'], 403);
            }

            $newSchoolId = $newBuilding->school_id;
        }

        $updateData = [];
        if ($request->has('room_number')) {
            $updateData['room_number'] = trim($request->room_number);
        }
        if ($request->has('building_id')) {
            $updateData['building_id'] = $request->building_id;
            $updateData['school_id'] = $newSchoolId; // Update school_id from new building
        }
        if ($request->has('staff_id')) {
            $updateData['staff_id'] = $request->staff_id ?? null;
        }

        $room->update($updateData);

        // Refresh the model to ensure we have the latest data
        $room->refresh();

        // Enrich with relationships
        $roomArray = $room->toArray();

        // Add building
        $building = DB::table('buildings')
            ->where('id', $room->building_id)
            ->whereNull('deleted_at')
            ->first();

        $roomArray['building'] = $building ? [
            'id' => $building->id,
            'building_name' => $building->building_name,
            'school_id' => $building->school_id,
        ] : null;

        // Add staff
        if (!empty($room->staff_id) && Schema::hasTable('staff')) {
            $staff = DB::table('staff')
                ->where('id', $room->staff_id)
                ->whereNull('deleted_at')
                ->first();

            if ($staff) {
                $staffProfile = null;
                if (!empty($staff->profile_id) && $staff->profile_id !== '0' && $staff->profile_id !== 0) {
                    $staffProfile = DB::table('profiles')
                        ->where('id', $staff->profile_id)
                        ->first();
                }

                $roomArray['staff'] = [
                    'id' => $staff->id,
                    'profile' => $staffProfile ? [
                        'full_name' => $staffProfile->full_name ?? null,
                    ] : null,
                ];
            } else {
                $roomArray['staff'] = null;
            }
        } else {
            $roomArray['staff'] = null;
        }

        return response()->json($roomArray);
    }

    /**
     * Remove the specified room (soft delete)
     */
    public function destroy(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Ensure organization context is set for Spatie permissions
        if (method_exists($user, 'setPermissionsTeamId')) {
            $user->setPermissionsTeamId($profile->organization_id);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('rooms.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for rooms.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId(request());
        $schoolIds = [$currentSchoolId];

        $room = Room::whereNull('deleted_at')->find($id);

        if (!$room) {
            return response()->json(['error' => 'Room not found'], 404);
        }

        // Validate room belongs to accessible school
        if (!in_array($room->school_id, $schoolIds)) {
            return response()->json(['error' => 'Room not found'], 404);
        }

        // Validate organization access via school
        $school = DB::table('school_branding')
            ->where('id', $room->school_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$school) {
            return response()->json(['error' => 'Room not found'], 404);
        }

        // Check organization access (all users)
        if ($school->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot delete room from different organization'], 403);
        }

        // Check if room is in use (e.g., by class_academic_years)
        if (Schema::hasTable('class_academic_years')) {
            $inUse = DB::table('class_academic_years')
                ->where('room_id', $id)
                ->whereNull('deleted_at')
                ->exists();

            if ($inUse) {
                return response()->json(['error' => 'This room is in use and cannot be deleted'], 400);
            }
        }

        $room->delete(); // Soft delete

        return response()->json(['message' => 'Room deleted successfully'], 200);
    }
}


