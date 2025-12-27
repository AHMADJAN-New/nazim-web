<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class HostelController extends Controller
{
    /**
     * Aggregate hostel occupancy stats and related lookup data for the current organization
     */
    public function overview(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Enforce organization-scoped permission checks (allow hostel or rooms read)
        try {
            $hasHostelRead = $user->hasPermissionTo('hostel.read');
        } catch (\Exception $e) {
            Log::warning('Permission check failed for hostel.read: ' . $e->getMessage());
            $hasHostelRead = false;
        }

        try {
            $hasRoomsRead = $user->hasPermissionTo('rooms.read');
        } catch (\Exception $e) {
            Log::warning('Permission check failed for rooms.read: ' . $e->getMessage());
            $hasRoomsRead = false;
        }

        try {
            $hasAdmissionsRead = $user->hasPermissionTo('student_admissions.read');
        } catch (\Exception $e) {
            Log::warning('Permission check failed for student_admissions.read: ' . $e->getMessage());
            $hasAdmissionsRead = false;
        }

        if ((!$hasHostelRead && !$hasRoomsRead) || !$hasAdmissionsRead) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Get accessible organization IDs (user's organization only)
        $orgIds = [$profile->organization_id];

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $schoolIds = [$currentSchoolId];

        // Filter rooms by accessible schools and organization
        $rooms = DB::table('rooms')
            ->whereNull('rooms.deleted_at')
            ->whereIn('rooms.school_id', $schoolIds)
            ->leftJoin('buildings', function ($join) {
                $join->on('rooms.building_id', '=', 'buildings.id')
                    ->whereNull('buildings.deleted_at');
            })
            ->leftJoin('staff', function ($join) {
                $join->on('rooms.staff_id', '=', 'staff.id')
                    ->whereNull('staff.deleted_at');
            })
            ->leftJoin('profiles as staff_profiles', 'staff.id', '=', 'staff_profiles.id')
            ->select(
                'rooms.id',
                'rooms.room_number',
                'rooms.building_id',
                'rooms.staff_id',
                'buildings.building_name',
                'buildings.school_id as building_school_id',
                'staff_profiles.full_name as staff_name'
            )
            ->get();

        // Fetch admissions (boarders and day scholars) scoped to accessible schools and organization
        $admissions = DB::table('student_admissions as sa')
            ->join('students as s', function ($join) {
                $join->on('sa.student_id', '=', 's.id')
                    ->whereNull('s.deleted_at');
            })
            ->whereNull('sa.deleted_at')
            ->whereIn('sa.organization_id', $orgIds)
            ->whereIn('sa.school_id', $schoolIds)
            ->select(
                'sa.id',
                'sa.room_id',
                'sa.is_boarder',
                'sa.student_id',
                'sa.admission_year',
                'sa.class_id',
                'sa.residency_type_id',
                's.full_name',
                's.admission_no'
            )
            ->get();

        // Group admissions by room_id for quick lookups
        $occupancyByRoom = [];
        foreach ($admissions as $admission) {
            if (!$admission->room_id) {
                continue;
            }
            if (!isset($occupancyByRoom[$admission->room_id])) {
                $occupancyByRoom[$admission->room_id] = [];
            }
            $occupancyByRoom[$admission->room_id][] = $admission;
        }

        $roomPayload = [];
        $buildingRoomCounts = [];
        $buildingOccupancyCounts = [];
        $buildingStudentCounts = [];
        $buildingWardenSets = [];

        foreach ($rooms as $room) {
            $occupants = $occupancyByRoom[$room->id] ?? [];
            $buildingId = $room->building_id;

            $roomPayload[] = [
                'id' => $room->id,
                'room_number' => $room->room_number,
                'building_id' => $buildingId,
                'building_name' => $room->building_name,
                'staff_id' => $room->staff_id,
                'staff_name' => $room->staff_name,
                'occupants' => array_map(function ($admission) {
                    return [
                        'id' => $admission->id,
                        'student_id' => $admission->student_id,
                        'student_name' => $admission->full_name,
                        'admission_number' => $admission->admission_no,
                        'admission_year' => $admission->admission_year,
                    ];
                }, $occupants),
            ];

            // Track building-level counts
            if ($buildingId) {
                $buildingRoomCounts[$buildingId] = ($buildingRoomCounts[$buildingId] ?? 0) + 1;
                $buildingStudentCounts[$buildingId] = ($buildingStudentCounts[$buildingId] ?? 0) + count($occupants);

                if (!empty($room->staff_id)) {
                    if (!isset($buildingWardenSets[$buildingId])) {
                        $buildingWardenSets[$buildingId] = [];
                    }
                    $buildingWardenSets[$buildingId][$room->staff_id] = true;
                }

                if (!empty($occupants)) {
                    $buildingOccupancyCounts[$buildingId] = ($buildingOccupancyCounts[$buildingId] ?? 0) + 1;
                }
            }
        }

        // Build building-level payload
        $buildingPayload = [];
        if (!empty($buildingRoomCounts)) {
            $buildingRecords = DB::table('buildings')
                ->whereIn('id', array_keys($buildingRoomCounts))
                ->whereNull('deleted_at')
                ->select('id', 'building_name')
                ->get();

            foreach ($buildingRecords as $building) {
                $buildingPayload[] = [
                    'id' => $building->id,
                    'building_name' => $building->building_name,
                    'room_count' => $buildingRoomCounts[$building->id] ?? 0,
                    'occupied_rooms' => $buildingOccupancyCounts[$building->id] ?? 0,
                    'students_in_rooms' => $buildingStudentCounts[$building->id] ?? 0,
                    'wardens_assigned' => isset($buildingWardenSets[$building->id])
                        ? count($buildingWardenSets[$building->id])
                        : 0,
                ];
            }
        }

        $totalRooms = count($rooms);
        $occupiedRooms = 0;
        $totalStudentsInRooms = 0;
        $uniqueWardens = [];

        foreach ($roomPayload as $room) {
            $occupantCount = count($room['occupants']);
            $totalStudentsInRooms += $occupantCount;
            if ($occupantCount > 0) {
                $occupiedRooms++;
            }
            if (!empty($room['staff_id'])) {
                $uniqueWardens[$room['staff_id']] = true;
            }
        }

        $unassignedBoarders = $admissions
            ->filter(fn ($admission) => $admission->is_boarder && empty($admission->room_id))
            ->count();

        $unassignedBoarderAdmissions = $admissions
            ->filter(fn ($admission) => $admission->is_boarder && empty($admission->room_id));

        $classNames = [];
        $residencyNames = [];

        if ($unassignedBoarderAdmissions->isNotEmpty()) {
            $classIds = $unassignedBoarderAdmissions->pluck('class_id')->filter()->unique()->values();
            if ($classIds->isNotEmpty()) {
                $classNames = DB::table('classes')
                    ->whereIn('id', $classIds)
                    ->whereNull('deleted_at')
                    ->pluck('name', 'id')
                    ->toArray();
            }

            $residencyTypeIds = $unassignedBoarderAdmissions->pluck('residency_type_id')->filter()->unique()->values();
            if ($residencyTypeIds->isNotEmpty()) {
                $residencyNames = DB::table('residency_types')
                    ->whereIn('id', $residencyTypeIds)
                    ->whereNull('deleted_at')
                    ->pluck('name', 'id')
                    ->toArray();
            }
        }

        $unassignedBoarderPayload = $unassignedBoarderAdmissions->map(function ($admission) use ($classNames, $residencyNames) {
            return [
                'id' => $admission->id,
                'student_id' => $admission->student_id,
                'student_name' => $admission->full_name,
                'admission_number' => $admission->admission_no,
                'class_id' => $admission->class_id,
                'class_name' => $admission->class_id && isset($classNames[$admission->class_id])
                    ? $classNames[$admission->class_id]
                    : null,
                'residency_type_id' => $admission->residency_type_id,
                'residency_type_name' => $admission->residency_type_id && isset($residencyNames[$admission->residency_type_id])
                    ? $residencyNames[$admission->residency_type_id]
                    : null,
            ];
        });

        $summary = [
            'total_rooms' => $totalRooms,
            'occupied_rooms' => $occupiedRooms,
            'total_students_in_rooms' => $totalStudentsInRooms,
            'total_buildings' => count(array_unique(array_filter($rooms->pluck('building_id')->toArray()))),
            'unique_wardens' => count($uniqueWardens),
            'unassigned_boarders' => $unassignedBoarders,
            'occupancy_rate' => $totalRooms > 0 ? round(($occupiedRooms / $totalRooms) * 100, 1) : 0,
        ];

        return response()->json([
            'summary' => $summary,
            'rooms' => $roomPayload,
            'buildings' => $buildingPayload,
            'unassigned_boarders' => $unassignedBoarderPayload,
        ]);
    }
}