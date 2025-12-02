<?php

namespace App\Http\Controllers;

use App\Models\ClassModel;
use App\Models\ClassAcademicYear;
use App\Http\Requests\StoreClassRequest;
use App\Http\Requests\UpdateClassRequest;
use App\Http\Requests\AssignClassToYearRequest;
use App\Http\Requests\BulkAssignSectionsRequest;
use App\Http\Requests\CopyClassesRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ClassController extends Controller
{
    /**
     * Display a listing of classes
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
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

        $query = ClassModel::whereNull('deleted_at');

        // Filter by organization (include global classes where organization_id IS NULL)
        if ($request->has('organization_id') && $request->organization_id) {
            if (in_array($request->organization_id, $orgIds)) {
                $query->where(function ($q) use ($request) {
                    $q->where('organization_id', $request->organization_id)
                      ->orWhereNull('organization_id'); // Include global classes
                });
            } else {
                return response()->json([]);
            }
        } else {
            // Show user's org classes + global classes
            if (!empty($orgIds)) {
                $query->where(function ($q) use ($orgIds) {
                    $q->whereIn('organization_id', $orgIds)
                      ->orWhereNull('organization_id'); // Include global classes
                });
            } else {
                // No org access, only show global classes
                $query->whereNull('organization_id');
            }
        }

        $classes = $query->orderBy('grade_level', 'asc')
            ->orderBy('name', 'asc')
            ->get();

        return response()->json($classes);
    }

    /**
     * Store a newly created class
     */
    public function store(StoreClassRequest $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }


        // Get organization_id - use provided or user's org
        $organizationId = $request->organization_id;
        if ($organizationId === null) {
            if ($profile->role === 'super_admin' && $profile->organization_id === null) {
                $organizationId = null; // Global class
            } else if ($profile->organization_id) {
                $organizationId = $profile->organization_id;
            } else {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }
        }

        // Validate organization access (unless super admin)
        if ($profile->role !== 'super_admin' && $organizationId !== $profile->organization_id && $organizationId !== null) {
            return response()->json(['error' => 'Cannot create class for different organization'], 403);
        }

        $class = ClassModel::create([
            'name' => $request->name,
            'code' => $request->code,
            'grade_level' => $request->grade_level,
            'description' => $request->description,
            'default_capacity' => $request->default_capacity ?? 30,
            'is_active' => $request->is_active ?? true,
            'organization_id' => $organizationId,
        ]);

        return response()->json($class, 201);
    }

    /**
     * Display the specified class
     */
    public function show(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }


        $class = ClassModel::whereNull('deleted_at')->find($id);

        if (!$class) {
            return response()->json(['error' => 'Class not found'], 404);
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

        // Check organization access (allow global classes)
        if ($class->organization_id !== null && !in_array($class->organization_id, $orgIds)) {
            return response()->json(['error' => 'Class not found'], 404);
        }

        return response()->json($class);
    }

    /**
     * Update the specified class
     */
    public function update(UpdateClassRequest $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }


        $class = ClassModel::whereNull('deleted_at')->find($id);

        if (!$class) {
            return response()->json(['error' => 'Class not found'], 404);
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

        // Check organization access (unless super admin)
        if ($profile->role !== 'super_admin' && $class->organization_id !== null && !in_array($class->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot update class from different organization'], 403);
        }

        // Prevent organization_id changes (unless super admin)
        if ($request->has('organization_id') && $profile->role !== 'super_admin') {
            return response()->json(['error' => 'Cannot change organization_id'], 403);
        }

        $class->update($request->only([
            'name',
            'code',
            'grade_level',
            'description',
            'default_capacity',
            'is_active',
        ]));

        return response()->json($class);
    }

    /**
     * Remove the specified class (soft delete)
     */
    public function destroy(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }


        $class = ClassModel::whereNull('deleted_at')->find($id);

        if (!$class) {
            return response()->json(['error' => 'Class not found'], 404);
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

        // Check organization access (unless super admin)
        if ($profile->role !== 'super_admin' && $class->organization_id !== null && !in_array($class->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot delete class from different organization'], 403);
        }

        // Check if class is in use (has active class_academic_years)
        $activeInstances = ClassAcademicYear::where('class_id', $id)
            ->whereNull('deleted_at')
            ->exists();

        if ($activeInstances) {
            return response()->json(['error' => 'Cannot delete class that is assigned to academic years. Please remove all assignments first.'], 422);
        }

        // Soft delete
        $class->delete();

        return response()->json(['message' => 'Class deleted successfully']);
    }

    /**
     * Assign class to academic year
     */
    public function assignToYear(AssignClassToYearRequest $request, string $class)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }


        // Get class to determine organization_id
        $classModel = ClassModel::whereNull('deleted_at')->find($class);
        if (!$classModel) {
            return response()->json(['error' => 'Class not found'], 404);
        }

        // Get academic year to verify organization_id matches
        $academicYear = DB::table('academic_years')
            ->where('id', $request->academic_year_id)
            ->whereNull('deleted_at')
            ->first();
        if (!$academicYear) {
            return response()->json(['error' => 'Academic year not found'], 404);
        }

        // Determine organization_id (prefer class's, fallback to academic year's)
        $organizationId = $classModel->organization_id ?? $academicYear->organization_id;

        // Validate organization access
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

        if ($profile->role !== 'super_admin' && $organizationId !== null && !in_array($organizationId, $orgIds)) {
            return response()->json(['error' => 'Cannot assign class to academic year from different organization'], 403);
        }

        // Check for duplicate (same class, year, and section)
        $sectionKey = $request->section_name ?: '';
        $existing = ClassAcademicYear::where('class_id', $class)
            ->where('academic_year_id', $request->academic_year_id)
            ->whereNull('deleted_at')
            ->where(function ($q) use ($sectionKey) {
                if ($sectionKey === '') {
                    $q->whereNull('section_name');
                } else {
                    $q->where('section_name', $sectionKey);
                }
            })
            ->first();

        if ($existing) {
            return response()->json(['error' => 'This class section is already assigned to this academic year'], 422);
        }

        $instance = ClassAcademicYear::create([
            'class_id' => $class,
            'academic_year_id' => $request->academic_year_id,
            'organization_id' => $organizationId,
            'section_name' => $request->section_name,
            'room_id' => $request->room_id,
            'capacity' => $request->capacity,
            'notes' => $request->notes,
            'is_active' => true,
            'current_student_count' => 0,
        ]);

        // Load relationships
        $instance->load(['class', 'organization']);

        return response()->json($instance, 201);
    }

    /**
     * Bulk assign sections
     */
    public function bulkAssignSections(BulkAssignSectionsRequest $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }


        // Get class to determine organization_id
        $class = ClassModel::whereNull('deleted_at')->find($request->class_id);
        if (!$class) {
            return response()->json(['error' => 'Class not found'], 404);
        }

        // Get academic year
        $academicYear = DB::table('academic_years')
            ->where('id', $request->academic_year_id)
            ->whereNull('deleted_at')
            ->first();
        if (!$academicYear) {
            return response()->json(['error' => 'Academic year not found'], 404);
        }

        // Determine organization_id
        $organizationId = $class->organization_id ?? $academicYear->organization_id;

        // Validate organization access
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

        if ($profile->role !== 'super_admin' && $organizationId !== null && !in_array($organizationId, $orgIds)) {
            return response()->json(['error' => 'Cannot assign class to academic year from different organization'], 403);
        }

        // Check for existing sections
        $existingInstances = ClassAcademicYear::where('class_id', $request->class_id)
            ->where('academic_year_id', $request->academic_year_id)
            ->whereNull('deleted_at')
            ->get();

        $existingSections = $existingInstances->map(function ($inst) {
            return strtoupper($inst->section_name ?: '');
        })->toArray();

        // Filter out sections that already exist
        $newSections = array_filter($request->sections, function ($section) use ($existingSections) {
            return !in_array(strtoupper(trim($section)), $existingSections);
        });

        if (empty($newSections)) {
            return response()->json(['error' => 'All specified sections already exist for this class in this academic year'], 422);
        }

        // Prepare bulk insert data
        $insertData = array_map(function ($section) use ($request, $class, $organizationId) {
            return [
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'class_id' => $request->class_id,
                'academic_year_id' => $request->academic_year_id,
                'organization_id' => $organizationId,
                'section_name' => trim($section),
                'room_id' => $request->default_room_id,
                'capacity' => $request->default_capacity ?? $class->default_capacity,
                'is_active' => true,
                'current_student_count' => 0,
            ];
        }, $newSections);

        // Bulk insert
        ClassAcademicYear::insert($insertData);

        $created = ClassAcademicYear::where('class_id', $request->class_id)
            ->where('academic_year_id', $request->academic_year_id)
            ->whereIn('section_name', array_map('trim', $newSections))
            ->whereNull('deleted_at')
            ->get();

        return response()->json([
            'created' => $created,
            'skipped' => count($request->sections) - count($newSections),
        ], 201);
    }

    /**
     * Update class academic year instance
     */
    public function updateInstance(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }


        $request->validate([
            'section_name' => 'nullable|string|max:50',
            'room_id' => 'nullable|uuid|exists:rooms,id',
            'capacity' => 'nullable|integer|min:1|max:200',
            'teacher_id' => 'nullable|uuid|exists:profiles,id',
            'is_active' => 'boolean',
            'notes' => 'nullable|string|max:500',
        ]);

        $instance = ClassAcademicYear::whereNull('deleted_at')->find($id);
        if (!$instance) {
            return response()->json(['error' => 'Class instance not found'], 404);
        }

        // Validate organization access
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

        if ($profile->role !== 'super_admin' && $instance->organization_id !== null && !in_array($instance->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot update class instance from different organization'], 403);
        }

        // Check for duplicate section if section_name is being updated
        if ($request->has('section_name')) {
            $sectionKey = $request->section_name ?: '';
            $existing = ClassAcademicYear::where('class_id', $instance->class_id)
                ->where('academic_year_id', $instance->academic_year_id)
                ->where('id', '!=', $id)
                ->whereNull('deleted_at')
                ->where(function ($q) use ($sectionKey) {
                    if ($sectionKey === '') {
                        $q->whereNull('section_name');
                    } else {
                        $q->where('section_name', $sectionKey);
                    }
                })
                ->first();

            if ($existing) {
                return response()->json(['error' => 'This section already exists for this class in this academic year'], 422);
            }
        }

        $instance->update($request->only([
            'section_name',
            'room_id',
            'capacity',
            'teacher_id',
            'is_active',
            'notes',
        ]));

        $instance->load(['class', 'organization']);

        return response()->json($instance);
    }

    /**
     * Remove class from academic year (soft delete)
     */
    public function removeFromYear(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }


        $instance = ClassAcademicYear::whereNull('deleted_at')->find($id);
        if (!$instance) {
            return response()->json(['error' => 'Class instance not found'], 404);
        }

        // Validate organization access
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

        if ($profile->role !== 'super_admin' && $instance->organization_id !== null && !in_array($instance->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot remove class instance from different organization'], 403);
        }

        // Check if there are enrolled students
        if ($instance->current_student_count > 0) {
            return response()->json(['error' => 'Cannot remove class instance that has enrolled students. Please transfer or remove students first.'], 422);
        }

        // Soft delete
        $instance->delete();

        return response()->json(['message' => 'Class removed from academic year successfully']);
    }

    /**
     * Copy classes between academic years
     */
    public function copyBetweenYears(CopyClassesRequest $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }


        // Get all class instances to copy
        $sourceInstances = ClassAcademicYear::where('academic_year_id', $request->from_academic_year_id)
            ->whereIn('id', $request->class_instance_ids)
            ->whereNull('deleted_at')
            ->get();

        if ($sourceInstances->isEmpty()) {
            return response()->json(['error' => 'No class instances found to copy'], 404);
        }

        // Prepare new instances
        $newInstances = [];
        foreach ($sourceInstances as $instance) {
            $sectionKey = $instance->section_name ?: '';
            
            // Check for duplicates before inserting
            $existing = ClassAcademicYear::where('class_id', $instance->class_id)
                ->where('academic_year_id', $request->to_academic_year_id)
                ->whereNull('deleted_at')
                ->where(function ($q) use ($sectionKey) {
                    if ($sectionKey === '') {
                        $q->whereNull('section_name');
                    } else {
                        $q->where('section_name', $sectionKey);
                    }
                })
                ->first();

            if ($existing) {
                continue; // Skip this one
            }

            $newInstance = [
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'class_id' => $instance->class_id,
                'academic_year_id' => $request->to_academic_year_id,
                'organization_id' => $instance->organization_id,
                'section_name' => $instance->section_name,
                'capacity' => $instance->capacity,
                'notes' => $instance->notes,
                'is_active' => true,
                'current_student_count' => 0, // Reset student count
            ];

            // Copy assignments if requested
            if ($request->copy_assignments) {
                $newInstance['teacher_id'] = $instance->teacher_id;
                $newInstance['room_id'] = $instance->room_id;
            }

            $newInstances[] = $newInstance;
        }

        if (empty($newInstances)) {
            return response()->json(['error' => 'All class instances already exist in target academic year'], 422);
        }

        // Insert all new instances
        ClassAcademicYear::insert($newInstances);

        $created = ClassAcademicYear::where('academic_year_id', $request->to_academic_year_id)
            ->whereIn('class_id', array_column($newInstances, 'class_id'))
            ->whereNull('deleted_at')
            ->get();

        return response()->json($created, 201);
    }

    /**
     * Get class academic years (for history view)
     */
    public function academicYears(string $class)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }


        $instances = ClassAcademicYear::where('class_id', $class)
            ->whereNull('deleted_at')
            ->with(['class'])
            ->get();

        // Enrich with academic year data
        $academicYearIds = $instances->pluck('academic_year_id')->unique();
        $academicYears = DB::table('academic_years')
            ->whereIn('id', $academicYearIds)
            ->whereNull('deleted_at')
            ->get()
            ->keyBy('id');

        // Enrich with room data if needed
        $roomIds = $instances->pluck('room_id')->filter()->unique();
        $rooms = [];
        if ($roomIds->isNotEmpty()) {
            $rooms = DB::table('rooms')
                ->whereIn('id', $roomIds)
                ->whereNull('deleted_at')
                ->get()
                ->keyBy('id');
        }

        $enriched = $instances->map(function ($instance) use ($academicYears, $rooms) {
            $academicYear = $academicYears->get($instance->academic_year_id);
            $room = $rooms->get($instance->room_id ?? '');
            
            return [
                ...$instance->toArray(),
                'academic_year' => $academicYear ? [
                    'id' => $academicYear->id,
                    'name' => $academicYear->name,
                    'start_date' => $academicYear->start_date,
                    'end_date' => $academicYear->end_date,
                    'is_current' => $academicYear->is_current,
                ] : null,
                'room' => $room ? [
                    'id' => $room->id,
                    'room_number' => $room->room_number,
                ] : null,
            ];
        });

        // Sort by academic year start_date (descending - most recent first)
        return response()->json($enriched->sortByDesc(function ($item) {
            return $item['academic_year']['start_date'] ?? '';
        })->values());
    }

    /**
     * Get class academic years by academic year
     */
    public function byAcademicYear(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                Log::warning('[ClassController::byAcademicYear] User not authenticated');
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile) {
                Log::warning('[ClassController::byAcademicYear] Profile not found for user', ['user_id' => $user->id]);
                return response()->json(['error' => 'Profile not found'], 404);
            }

            // Validate academic_year_id format
            $request->validate([
                'academic_year_id' => 'required|uuid',
                'organization_id' => 'nullable|uuid',
            ]);

            // Verify academic year exists and is not deleted
            $academicYear = DB::table('academic_years')
                ->where('id', $request->academic_year_id)
                ->whereNull('deleted_at')
                ->first();

            if (!$academicYear) {
                Log::warning('[ClassController::byAcademicYear] Academic year not found', ['academic_year_id' => $request->academic_year_id]);
                return response()->json(['error' => 'Academic year not found'], 404);
            }

            // Validate organization_id if provided
            if ($request->has('organization_id') && $request->organization_id) {
                $orgExists = DB::table('organizations')
                    ->where('id', $request->organization_id)
                    ->whereNull('deleted_at')
                    ->exists();
                
                if (!$orgExists) {
                    return response()->json(['error' => 'Organization not found'], 404);
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

            $query = ClassAcademicYear::where('academic_year_id', $request->academic_year_id)
                ->whereNull('deleted_at')
                ->with(['class' => function($q) {
                    $q->whereNull('deleted_at');
                }, 'organization']);

            // Filter by organization
            if ($request->has('organization_id') && $request->organization_id) {
                if (in_array($request->organization_id, $orgIds)) {
                    $query->where(function($q) use ($request) {
                        $q->where('organization_id', $request->organization_id)
                          ->orWhereNull('organization_id');
                    });
                } else {
                    return response()->json([]);
                }
            } else {
                if (!empty($orgIds)) {
                    $query->where(function($q) use ($orgIds) {
                        $q->whereIn('organization_id', $orgIds)
                          ->orWhereNull('organization_id');
                    });
                } else {
                    // No org access, only show global instances
                    $query->whereNull('organization_id');
                }
            }

            try {
                $instances = $query->orderBy('section_name', 'asc')
                    ->get();
            } catch (\Exception $e) {
                Log::error('[ClassController::byAcademicYear] Error fetching instances', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                    'academic_year_id' => $request->academic_year_id
                ]);
                // Return empty array instead of throwing to prevent 500 error
                return response()->json([]);
            }

            // Filter out instances where class doesn't exist (soft-deleted or missing)
            $instances = $instances->filter(function ($instance) {
                try {
                    // Check if class relationship exists and is not soft-deleted
                    if (!$instance->class) {
                        return false;
                    }
                    // The with() clause already filters for non-deleted classes, so if class exists, it's valid
                    return true;
                } catch (\Exception $e) {
                    // If accessing class relationship fails, filter out this instance
                    Log::warning('[ClassController::byAcademicYear] Error accessing class relationship', [
                        'instance_id' => $instance->id ?? 'unknown',
                        'error' => $e->getMessage()
                    ]);
                    return false;
                }
            });

            // Enrich with academic year and room data
            $roomIds = $instances->pluck('room_id')->filter()->unique();
            $rooms = [];
            if ($roomIds->isNotEmpty()) {
                $rooms = DB::table('rooms')
                    ->whereIn('id', $roomIds)
                    ->whereNull('deleted_at')
                    ->get()
                    ->keyBy('id');
            }

            $enriched = $instances->map(function ($instance) use ($academicYear, $rooms) {
                try {
                    $room = null;
                    if ($instance->room_id && isset($rooms[$instance->room_id])) {
                        $room = $rooms[$instance->room_id];
                    }
                    
                    // Handle case where class might be null (soft-deleted)
                    $classData = null;
                    if ($instance->class) {
                        $classData = [
                            'id' => $instance->class->id ?? null,
                            'name' => $instance->class->name ?? null,
                            'code' => $instance->class->code ?? null,
                            'grade_level' => $instance->class->grade_level ?? null,
                        ];
                    }
                    
                    // Build response manually to avoid issues with toArray() on relationships
                    return [
                        'id' => $instance->id,
                        'class_id' => $instance->class_id,
                        'academic_year_id' => $instance->academic_year_id,
                        'organization_id' => $instance->organization_id,
                        'section_name' => $instance->section_name,
                        'teacher_id' => $instance->teacher_id,
                        'room_id' => $instance->room_id,
                        'capacity' => $instance->capacity,
                        'current_student_count' => $instance->current_student_count,
                        'is_active' => $instance->is_active,
                        'notes' => $instance->notes,
                        'created_at' => $instance->created_at,
                        'updated_at' => $instance->updated_at,
                        'class' => $classData,
                        'academic_year' => $academicYear ? [
                            'id' => $academicYear->id ?? null,
                            'name' => $academicYear->name ?? null,
                            'start_date' => $academicYear->start_date ?? null,
                            'end_date' => $academicYear->end_date ?? null,
                        ] : null,
                        'room' => $room ? [
                            'id' => $room->id ?? null,
                            'room_number' => $room->room_number ?? null,
                        ] : null,
                    ];
                } catch (\Exception $e) {
                    Log::error('[ClassController::byAcademicYear] Error enriching instance', [
                        'instance_id' => $instance->id ?? 'unknown',
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ]);
                    // Return instance data without enrichment on error
                    return $instance->toArray();
                }
            });

            return response()->json($enriched);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning('[ClassController::byAcademicYear] Validation error', ['errors' => $e->errors()]);
            // Return 422 with validation errors instead of throwing
            return response()->json([
                'error' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('[ClassController::byAcademicYear] Unexpected error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);
            return response()->json([
                'error' => 'An error occurred while fetching classes for academic year',
                'message' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }
}
