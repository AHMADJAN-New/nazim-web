<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class HostelController extends Controller
{
    /**
     * Aggregate hostel occupancy stats and related lookup data for the current organization
     */
    public function overview(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Enforce organization-scoped permission checks (allow hostel or rooms read)
        // Use manual query (Spatie's hasPermissionTo() doesn't work correctly with teams)
        $hasHostelRead = $this->userHasPermission($user, 'hostel.read', $profile->organization_id);
        $hasRoomsRead = $this->userHasPermission($user, 'rooms.read', $profile->organization_id);
        $hasAdmissionsRead = $this->userHasPermission($user, 'student_admissions.read', $profile->organization_id);

        if ((! $hasHostelRead && ! $hasRoomsRead) || ! $hasAdmissionsRead) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Get accessible organization IDs (user's organization only)
        $orgIds = [$profile->organization_id];

        // Use same school scope as SearchController / SchoolBrandingController: all org schools when schools_access_all
        $schoolIds = $this->getAccessibleSchoolIds($profile, $request);

        if ($schoolIds === []) {
            return response()->json([
                'summary' => [
                    'total_rooms' => 0,
                    'occupied_rooms' => 0,
                    'total_students_in_rooms' => 0,
                    'total_buildings' => 0,
                    'unique_wardens' => 0,
                    'unassigned_boarders' => 0,
                    'occupancy_rate' => 0,
                ],
                'rooms' => [],
                'buildings' => [],
                'unassigned_boarders' => [],
            ]);
        }

        // Filter rooms by accessible schools
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
                'sa.academic_year_id',
                'sa.class_id',
                'sa.class_academic_year_id',
                'sa.residency_type_id',
                's.full_name',
                's.admission_no',
                's.father_name',
            )
            ->get();

        $classIdsForNames = $admissions->pluck('class_id')->filter()->unique()->values();
        $classNamesById = [];
        if ($classIdsForNames->isNotEmpty()) {
            $classNameRows = DB::table('classes')
                ->whereIn('id', $classIdsForNames)
                ->whereNull('deleted_at')
                ->select('id', 'name', 'code')
                ->get();
            foreach ($classNameRows as $row) {
                $label = trim((string) ($row->name ?? ''));
                if ($label === '') {
                    $label = trim((string) ($row->code ?? ''));
                }
                if ($label !== '') {
                    $classNamesById[$row->id] = $label;
                }
            }
        }

        $composeClassLabel = static function (?string $baseName, ?string $code, ?string $section): ?string {
            $base = trim((string) ($baseName ?? ''));
            if ($base === '') {
                $base = trim((string) ($code ?? ''));
            }

            $sectionName = trim((string) ($section ?? ''));
            if ($base === '') {
                return $sectionName !== '' ? $sectionName : null;
            }

            return $sectionName !== '' ? $base.' — '.$sectionName : $base;
        };

        $classDisplayByCayId = [];
        // CAY row ids from the proper column, plus any admission.class_id that is NOT a base classes.id
        // (some records store class_academic_years.id in class_id while class_academic_year_id stays null).
        $cayIdsFromExplicit = $admissions->pluck('class_academic_year_id')->filter()->unique();
        $cayIdsFromAmbiguousClassId = $admissions->pluck('class_id')
            ->filter()
            ->unique()
            ->filter(fn ($id) => ! isset($classNamesById[$id]));
        $cayIdsForLabels = $cayIdsFromExplicit->merge($cayIdsFromAmbiguousClassId)->unique()->values();
        if ($cayIdsForLabels->isNotEmpty()) {
            $cayRows = DB::table('class_academic_years as cay')
                ->join('classes as c', function ($join) {
                    $join->on('cay.class_id', '=', 'c.id')
                        ->whereNull('c.deleted_at');
                })
                ->whereIn('cay.id', $cayIdsForLabels)
                ->whereNull('cay.deleted_at')
                ->select('cay.id', 'c.name as class_base_name', 'c.code as class_code', 'cay.section_name')
                ->get();

            foreach ($cayRows as $cayRow) {
                $label = $composeClassLabel($cayRow->class_base_name, $cayRow->class_code, $cayRow->section_name);
                if ($label !== null) {
                    $classDisplayByCayId[$cayRow->id] = $label;
                }
            }
        }

        // When class_academic_year_id is null but base class + academic year point to a CAY row.
        $classDisplayByClassIdAndAcademicYearId = [];
        $pairTuples = [];
        foreach ($admissions as $admission) {
            if (empty($admission->class_id) || empty($admission->academic_year_id)) {
                continue;
            }
            if (isset($classNamesById[$admission->class_id])) {
                continue;
            }
            if (! empty($admission->class_academic_year_id)) {
                continue;
            }
            $pairTuples[$admission->class_id.'|'.$admission->academic_year_id] = [
                $admission->class_id,
                $admission->academic_year_id,
            ];
        }
        if ($pairTuples !== []) {
            $cayPairRows = DB::table('class_academic_years as cay')
                ->join('classes as c', function ($join) {
                    $join->on('cay.class_id', '=', 'c.id')
                        ->whereNull('c.deleted_at');
                })
                ->whereNull('cay.deleted_at')
                ->where(function ($query) use ($pairTuples) {
                    foreach ($pairTuples as [$classId, $academicYearId]) {
                        $query->orWhere(function ($q) use ($classId, $academicYearId) {
                            $q->where('cay.class_id', $classId)
                                ->where('cay.academic_year_id', $academicYearId);
                        });
                    }
                })
                ->orderBy('cay.section_name')
                ->select('cay.class_id', 'cay.academic_year_id', 'c.name as class_base_name', 'c.code as class_code', 'cay.section_name')
                ->get();

            foreach ($cayPairRows as $cayRow) {
                $pairKey = $cayRow->class_id.'|'.$cayRow->academic_year_id;
                if (isset($classDisplayByClassIdAndAcademicYearId[$pairKey])) {
                    continue;
                }
                $label = $composeClassLabel($cayRow->class_base_name, $cayRow->class_code, $cayRow->section_name);
                if ($label !== null) {
                    $classDisplayByClassIdAndAcademicYearId[$pairKey] = $label;
                }
            }
        }

        $resolveAdmissionClassName = static function ($admission) use (
            $classNamesById,
            $classDisplayByCayId,
            $classDisplayByClassIdAndAcademicYearId
        ): ?string {
            if ($admission->class_id && isset($classNamesById[$admission->class_id])) {
                return $classNamesById[$admission->class_id];
            }
            if ($admission->class_academic_year_id && isset($classDisplayByCayId[$admission->class_academic_year_id])) {
                return $classDisplayByCayId[$admission->class_academic_year_id];
            }
            if ($admission->class_id && isset($classDisplayByCayId[$admission->class_id])) {
                return $classDisplayByCayId[$admission->class_id];
            }
            if ($admission->class_id && $admission->academic_year_id) {
                $pairKey = $admission->class_id.'|'.$admission->academic_year_id;
                if (isset($classDisplayByClassIdAndAcademicYearId[$pairKey])) {
                    return $classDisplayByClassIdAndAcademicYearId[$pairKey];
                }
            }

            return null;
        };

        $academicYearNamesById = [];
        $academicYearIdsForNames = $admissions->pluck('academic_year_id')->filter()->unique()->values();
        if ($academicYearIdsForNames->isNotEmpty()) {
            $academicYearNamesById = DB::table('academic_years')
                ->whereIn('id', $academicYearIdsForNames)
                ->whereNull('deleted_at')
                ->pluck('name', 'id')
                ->toArray();
        }

        // Group admissions by room_id for quick lookups
        $occupancyByRoom = [];
        foreach ($admissions as $admission) {
            if (! $admission->room_id) {
                continue;
            }
            if (! isset($occupancyByRoom[$admission->room_id])) {
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
                'occupants' => array_map(function ($admission) use ($resolveAdmissionClassName, $academicYearNamesById) {
                    return [
                        'id' => $admission->id,
                        'student_id' => $admission->student_id,
                        'student_name' => $admission->full_name,
                        'father_name' => $admission->father_name,
                        'admission_number' => $admission->admission_no,
                        'admission_year' => $admission->admission_year,
                        'academic_year_id' => $admission->academic_year_id,
                        'academic_year_name' => $admission->academic_year_id && isset($academicYearNamesById[$admission->academic_year_id])
                            ? $academicYearNamesById[$admission->academic_year_id]
                            : null,
                        'class_id' => $admission->class_id,
                        'class_academic_year_id' => $admission->class_academic_year_id,
                        'class_name' => $resolveAdmissionClassName($admission),
                    ];
                }, $occupants),
            ];

            // Track building-level counts
            if ($buildingId) {
                $buildingRoomCounts[$buildingId] = ($buildingRoomCounts[$buildingId] ?? 0) + 1;
                $buildingStudentCounts[$buildingId] = ($buildingStudentCounts[$buildingId] ?? 0) + count($occupants);

                if (! empty($room->staff_id)) {
                    if (! isset($buildingWardenSets[$buildingId])) {
                        $buildingWardenSets[$buildingId] = [];
                    }
                    $buildingWardenSets[$buildingId][$room->staff_id] = true;
                }

                if (! empty($occupants)) {
                    $buildingOccupancyCounts[$buildingId] = ($buildingOccupancyCounts[$buildingId] ?? 0) + 1;
                }
            }
        }

        // Build building-level payload
        $buildingPayload = [];
        if (! empty($buildingRoomCounts)) {
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
            if (! empty($room['staff_id'])) {
                $uniqueWardens[$room['staff_id']] = true;
            }
        }

        $unassignedBoarders = $admissions
            ->filter(fn ($admission) => $admission->is_boarder && empty($admission->room_id))
            ->count();

        $unassignedBoarderAdmissions = $admissions
            ->filter(fn ($admission) => $admission->is_boarder && empty($admission->room_id));

        $residencyNames = [];

        if ($unassignedBoarderAdmissions->isNotEmpty()) {
            $residencyTypeIds = $unassignedBoarderAdmissions->pluck('residency_type_id')->filter()->unique()->values();
            if ($residencyTypeIds->isNotEmpty()) {
                $residencyNames = DB::table('residency_types')
                    ->whereIn('id', $residencyTypeIds)
                    ->whereNull('deleted_at')
                    ->pluck('name', 'id')
                    ->toArray();
            }
        }

        $unassignedBoarderPayload = $unassignedBoarderAdmissions->map(function ($admission) use ($resolveAdmissionClassName, $residencyNames, $academicYearNamesById) {
            return [
                'id' => $admission->id,
                'student_id' => $admission->student_id,
                'student_name' => $admission->full_name,
                'father_name' => $admission->father_name,
                'admission_number' => $admission->admission_no,
                'admission_year' => $admission->admission_year,
                'academic_year_id' => $admission->academic_year_id,
                'academic_year_name' => $admission->academic_year_id && isset($academicYearNamesById[$admission->academic_year_id])
                    ? $academicYearNamesById[$admission->academic_year_id]
                    : null,
                'class_id' => $admission->class_id,
                'class_academic_year_id' => $admission->class_academic_year_id,
                'class_name' => $resolveAdmissionClassName($admission),
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
            // values(): filter() preserves keys so JSON would encode as object; frontend expects an array
            'unassigned_boarders' => $unassignedBoarderPayload->values()->all(),
        ]);
    }
}
