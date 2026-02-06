<?php

namespace App\Http\Controllers;

use App\Models\ClassModel;
use App\Models\ClassAcademicYear;
use App\Http\Requests\StoreClassRequest;
use App\Http\Requests\UpdateClassRequest;
use App\Http\Requests\AssignClassToYearRequest;
use App\Http\Requests\BulkAssignSectionsRequest;
use App\Http\Requests\CopyClassesRequest;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ClassController extends Controller
{
    public function __construct(
        private ActivityLogService $activityLogService
    ) {}
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

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$this->userHasPermission($user, 'classes.read', $profile->organization_id)) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for classes.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $query = ClassModel::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId);

        // Support pagination if page and per_page parameters are provided
        if ($request->has('page') || $request->has('per_page')) {
            $perPage = $request->input('per_page', 25);
            // Validate per_page is one of allowed values
            $allowedPerPage = [10, 25, 50, 100];
            if (!in_array((int)$perPage, $allowedPerPage)) {
                $perPage = 25; // Default to 25 if invalid
            }
            
            $classes = $query->orderBy('grade_level', 'asc')
                ->orderBy('name', 'asc')
                ->paginate((int)$perPage);
            
            // Return paginated response in Laravel's standard format
            return response()->json($classes);
        }

        // Return all results if no pagination requested (backward compatibility)
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

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('classes.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for classes.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $organizationId = $profile->organization_id;
        $currentSchoolId = $this->getCurrentSchoolId($request);

        $class = ClassModel::create([
            'name' => $request->name,
            'code' => $request->code,
            'grade_level' => $request->grade_level,
            'description' => $request->description,
            'default_capacity' => $request->default_capacity ?? 30,
            'is_active' => $request->is_active ?? true,
            'organization_id' => $organizationId,
            'school_id' => $currentSchoolId,
        ]);

        // Log class creation
        try {
            $this->activityLogService->logCreate(
                subject: $class,
                description: "Created class: {$class->name}",
                properties: [
                    'class_id' => $class->id,
                    'name' => $class->name,
                    'code' => $class->code,
                    'grade_level' => $class->grade_level,
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log class creation: ' . $e->getMessage());
        }

        return response()->json($class, 201);
    }

    /**
     * Display the specified class
     */
    public function show(Request $request, string $id)
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

        // Check permission WITH organization context
        try {
            if (!$this->userHasPermission($user, 'classes.read', $profile->organization_id)) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for classes.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $class = ClassModel::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$class) {
            return response()->json(['error' => 'Class not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Org access enforced by organization middleware + school scope.

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

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('classes.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for classes.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $class = ClassModel::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$class) {
            return response()->json(['error' => 'Class not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Prevent scope changes
        if ($request->has('organization_id') || $request->has('school_id')) {
            return response()->json(['error' => 'Cannot change scope fields'], 403);
        }

        // Capture old values before update
        $oldValues = $class->only(['name', 'code', 'grade_level', 'description', 'default_capacity', 'is_active']);

        $class->update($request->only([
            'name',
            'code',
            'grade_level',
            'description',
            'default_capacity',
            'is_active',
        ]));

        // Log class update
        try {
            $this->activityLogService->logUpdate(
                subject: $class,
                description: "Updated class: {$class->name}",
                properties: [
                    'old_values' => $oldValues,
                    'new_values' => $class->only(['name', 'code', 'grade_level', 'description', 'default_capacity', 'is_active']),
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log class update: ' . $e->getMessage());
        }

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

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('classes.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for classes.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = request()->get('current_school_id');
        $class = ClassModel::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$class) {
            return response()->json(['error' => 'Class not found'], 404);
        }

        // Check if class is in use (has active class_academic_years)
        $activeInstances = ClassAcademicYear::where('class_id', $id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->exists();

        if ($activeInstances) {
            return response()->json(['error' => 'Cannot delete class that is assigned to academic years. Please remove all assignments first.'], 422);
        }

        // Capture data before deletion
        $classData = $class->toArray();
        $className = $class->name;

        // Soft delete
        $class->delete();

        // Log class deletion
        try {
            $this->activityLogService->logDelete(
                subject: $class,
                description: "Deleted class: {$className}",
                properties: ['deleted_class' => $classData],
                request: request()
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log class deletion: ' . $e->getMessage());
        }

        return response()->noContent();
    }

    /**
     * Assign class to academic year
     */
    public function assignToYear(AssignClassToYearRequest $request, string $class = null)
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

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('classes.assign')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for classes.assign: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Get class ID from route parameter or request body
        $classId = $class;
        if (empty($classId) || $classId === 'undefined' || $classId === 'null') {
            // Try to get from request body
            $classId = $request->input('class_id');
        }

        // Validate class ID
        if (empty($classId) || $classId === 'undefined' || $classId === 'null') {
            Log::error('[ClassController::assignToYear] Missing class ID', [
                'route_param' => $class,
                'request_body' => $request->all(),
                'user_id' => $user->id ?? 'unknown'
            ]);
            return response()->json(['error' => 'Class ID is required'], 400);
        }

        // Validate UUID format
        $uuidPattern = '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i';
        if (!preg_match($uuidPattern, $classId)) {
            Log::error('[ClassController::assignToYear] Invalid class ID format', [
                'class_id' => $classId,
                'route_param' => $class,
                'user_id' => $user->id ?? 'unknown'
            ]);
            return response()->json(['error' => 'Invalid class ID format'], 400);
        }

        // Get class to determine organization_id
        $currentSchoolId = $this->getCurrentSchoolId($request);
        $classModel = ClassModel::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($classId);
        if (!$classModel) {
            return response()->json(['error' => 'Class not found'], 404);
        }

        // Get academic year to verify organization_id matches
        $academicYear = DB::table('academic_years')
            ->where('id', $request->academic_year_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();
        if (!$academicYear) {
            return response()->json(['error' => 'Academic year not found'], 404);
        }

        $organizationId = $profile->organization_id;

        // Check for duplicate (same class, year, and section)
        $sectionKey = $request->section_name ?: '';
        $existing = ClassAcademicYear::where('class_id', $classId)
            ->where('academic_year_id', $request->academic_year_id)
            ->where('school_id', $currentSchoolId)
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

        // Convert empty strings to NULL for nullable UUID fields
        $roomId = !empty($request->room_id) ? $request->room_id : null;
        $teacherId = !empty($request->teacher_id) ? $request->teacher_id : null;
        
        // Validate UUID format if provided
        $uuidPattern = '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i';
        if ($roomId && !preg_match($uuidPattern, $roomId)) {
            return response()->json(['error' => 'Invalid room ID format'], 400);
        }
        if ($teacherId && !preg_match($uuidPattern, $teacherId)) {
            return response()->json(['error' => 'Invalid teacher ID format'], 400);
        }

        $instance = ClassAcademicYear::create([
            'class_id' => $classId,
            'academic_year_id' => $request->academic_year_id,
            'organization_id' => $organizationId,
            'school_id' => $currentSchoolId,
            'section_name' => $request->section_name ?: null,
            'room_id' => $roomId,
            'teacher_id' => $teacherId,
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
        $currentSchoolId = $this->getCurrentSchoolId($request);
        $class = ClassModel::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($request->class_id);
        if (!$class) {
            return response()->json(['error' => 'Class not found'], 404);
        }

        // Get academic year
        $academicYear = DB::table('academic_years')
            ->where('id', $request->academic_year_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();
        if (!$academicYear) {
            return response()->json(['error' => 'Academic year not found'], 404);
        }

        $organizationId = $profile->organization_id;

        // Check for existing sections
        $existingInstances = ClassAcademicYear::where('class_id', $request->class_id)
            ->where('academic_year_id', $request->academic_year_id)
            ->where('school_id', $currentSchoolId)
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

        // Convert empty strings to NULL for nullable UUID fields
        $roomId = !empty($request->default_room_id) ? $request->default_room_id : null;
        
        // Validate UUID format if provided
        $uuidPattern = '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i';
        if ($roomId && !preg_match($uuidPattern, $roomId)) {
            return response()->json(['error' => 'Invalid room ID format'], 400);
        }

        // Prepare bulk insert data
        $insertData = array_map(function ($section) use ($request, $class, $organizationId, $roomId, $currentSchoolId) {
            return [
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'class_id' => $request->class_id,
                'academic_year_id' => $request->academic_year_id,
                'organization_id' => $organizationId,
                'school_id' => $currentSchoolId,
                'section_name' => trim($section) ?: null,
                'room_id' => $roomId,
                'capacity' => $request->default_capacity ?? $class->default_capacity,
                'is_active' => true,
                'current_student_count' => 0,
            ];
        }, $newSections);

        // Bulk insert
        ClassAcademicYear::insert($insertData);

        $created = ClassAcademicYear::where('class_id', $request->class_id)
            ->where('academic_year_id', $request->academic_year_id)
            ->where('school_id', $currentSchoolId)
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

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$this->userHasPermission($user, 'classes.read', $profile->organization_id)) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for classes.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $request->validate([
            'section_name' => 'nullable|string|max:50',
            'room_id' => 'nullable|uuid|exists:rooms,id',
            'capacity' => 'nullable|integer|min:1|max:200',
            'teacher_id' => 'nullable|uuid|exists:profiles,id',
            'is_active' => 'boolean',
            'notes' => 'nullable|string|max:500',
        ]);

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $instance = ClassAcademicYear::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);
        if (!$instance) {
            return response()->json(['error' => 'Class instance not found'], 404);
        }

        // Org access enforced by organization middleware + school scope.

        // Check for duplicate section if section_name is being updated
        if ($request->has('section_name')) {
            $sectionKey = $request->section_name ?: '';
            $existing = ClassAcademicYear::where('class_id', $instance->class_id)
                ->where('academic_year_id', $instance->academic_year_id)
                ->where('school_id', $currentSchoolId)
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

        // Convert empty strings to NULL for nullable UUID fields
        $updateData = $request->only([
            'section_name',
            'room_id',
            'capacity',
            'teacher_id',
            'is_active',
            'notes',
        ]);
        
        // Convert empty strings to null
        if (isset($updateData['room_id']) && $updateData['room_id'] === '') {
            $updateData['room_id'] = null;
        }
        if (isset($updateData['teacher_id']) && $updateData['teacher_id'] === '') {
            $updateData['teacher_id'] = null;
        }
        if (isset($updateData['section_name']) && $updateData['section_name'] === '') {
            $updateData['section_name'] = null;
        }

        $instance->update($updateData);

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


        $currentSchoolId = request()->get('current_school_id');
        $instance = ClassAcademicYear::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);
        if (!$instance) {
            return response()->json(['error' => 'Class instance not found'], 404);
        }

        // Org access enforced by organization middleware + school scope.

        // Check if there are enrolled students
        if ($instance->current_student_count > 0) {
            return response()->json(['error' => 'Cannot remove class instance that has enrolled students. Please transfer or remove students first.'], 422);
        }

        // Soft delete
        $instance->delete();

        return response()->noContent();
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

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$this->userHasPermission($user, 'classes.read', $profile->organization_id)) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for classes.copy: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Get all class instances to copy
        $currentSchoolId = $this->getCurrentSchoolId($request);
        $sourceInstances = ClassAcademicYear::where('academic_year_id', $request->from_academic_year_id)
            ->where('school_id', $currentSchoolId)
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
                ->where('school_id', $currentSchoolId)
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
                'school_id' => $currentSchoolId,
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
            ->where('school_id', $currentSchoolId)
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

        // Validate class ID is a valid UUID format
        if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $class)) {
            Log::warning('[ClassController::academicYears] Invalid class ID format', ['class_id' => $class]);
            return response()->json([]);
        }

        // Get instances first (without JOIN to avoid UUID parsing errors with corrupted data)
        $currentSchoolId = request()->get('current_school_id');
        $instances = DB::table('class_academic_years')
            ->where('class_id', $class)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->get();

        if ($instances->isEmpty()) {
            return response()->json([]);
        }

        // Load class data separately
        $classData = DB::table('classes')
            ->where('id', $class)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$classData) {
            return response()->json([]);
        }

        // Enrich with academic year data
        $academicYearIds = $instances->pluck('academic_year_id')->filter()->unique();
        $academicYears = [];
        if ($academicYearIds->isNotEmpty()) {
            $academicYears = DB::table('academic_years')
                ->whereIn('id', $academicYearIds)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->get()
                ->keyBy('id');
        }

        // Enrich with room data
        $roomIds = $instances->pluck('room_id')->filter()->unique();
        $rooms = [];
        if ($roomIds->isNotEmpty()) {
            $rooms = DB::table('rooms')
                ->whereIn('id', $roomIds)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->get()
                ->keyBy('id');
        }

        $enriched = $instances->map(function ($instance) use ($academicYears, $rooms, $classData) {
            $academicYear = $academicYears[$instance->academic_year_id] ?? null;
            $room = $rooms[$instance->room_id ?? ''] ?? null;

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
                'class' => $classData ? [
                    'id' => $classData->id,
                    'name' => $classData->name,
                    'code' => $classData->code,
                    'grade_level' => $classData->grade_level,
                ] : null,
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
     * Get a single class academic year by ID
     */
    public function getClassAcademicYear(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission
        try {
            if (!$this->userHasPermission($user, 'classes.read', $profile->organization_id)) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for classes.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = request()->get('current_school_id');
        $classAcademicYear = ClassAcademicYear::with(['class', 'academicYear', 'teacher', 'room'])
            ->whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$classAcademicYear) {
            return response()->json(['error' => 'Class academic year not found'], 404);
        }

        // Org access enforced by query.

        return response()->json($classAcademicYear);
    }

    /**
     * Get class academic years by academic year
     */
    public function byAcademicYear(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile) {
                return response()->json(['error' => 'Profile not found'], 404);
            }

            // Validate academic_year_id format
            $request->validate([
                'academic_year_id' => 'required|uuid',
                'organization_id' => 'nullable|uuid',
            ]);

            // Verify academic year exists
            $academicYear = DB::table('academic_years')
                ->where('id', $request->academic_year_id)
                ->where('school_id', $this->getCurrentSchoolId($request))
                ->whereNull('deleted_at')
                ->first();

            if (!$academicYear) {
                return response()->json([]);
            }

            // Require organization_id for all users
            if (!$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            $orgIds = [$profile->organization_id];
            $currentSchoolId = $this->getCurrentSchoolId($request);

            // Use raw SQL to filter out invalid UUIDs at database level
            // CRITICAL: Wrap in try-catch and use a subquery approach to safely filter invalid UUIDs
            // PostgreSQL will fail if we try to cast invalid UUIDs, so we need to catch and filter in PHP
            try {
                // First, get all instances without filtering class_id (to avoid UUID parsing errors)
                $allInstances = DB::table('class_academic_years')
                    ->where('academic_year_id', $request->academic_year_id)
                    ->where('school_id', $currentSchoolId)
                    ->whereNull('deleted_at')
                    ->get();

                // Filter invalid UUIDs in PHP (safer than PostgreSQL casting)
                $instances = $allInstances->filter(function($instance) {
                    if (empty($instance->class_id)) {
                        return false;
                    }
                    // Check if it's a valid UUID format using regex
                    return preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $instance->class_id);
                });

                // Filter by organization
                // Strict school scope: ignore org filter and disallow global instances
                $instances = $instances->filter(function ($instance) use ($orgIds) {
                    return in_array($instance->organization_id, $orgIds, true);
                });

                // Sort by section_name
                $instances = $instances->sortBy('section_name')->values();
            } catch (\Exception $e) {
                Log::error('[ClassController::byAcademicYear] Error fetching instances', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                return response()->json([]);
            }

            if ($instances->isEmpty()) {
                return response()->json([]);
            }

            // Now get class IDs and load classes separately (only valid UUIDs will be queried)
            $classIds = $instances->pluck('class_id')
                ->unique()
                ->filter(function($id) {
                    if (empty($id)) return false;
                    // Double-check UUID format in PHP as well
                    return preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $id);
                })
                ->values();

            if ($classIds->isEmpty()) {
                return response()->json([]);
            }

            // Load classes using only valid UUIDs - wrap in try-catch to handle any DB errors
            try {
                $classes = DB::table('classes')
                    ->whereIn('id', $classIds->toArray())
                    ->where('school_id', $currentSchoolId)
                    ->whereNull('deleted_at')
                    ->get()
                    ->keyBy('id');
            } catch (\Exception $e) {
                Log::error('[ClassController::byAcademicYear] Error loading classes', [
                    'error' => $e->getMessage(),
                    'class_ids' => $classIds->toArray(),
                ]);
                return response()->json([]);
            }

            // Filter instances to only those with valid classes
            $instances = $instances->filter(function($instance) use ($classes) {
                return isset($classes[$instance->class_id]);
            });

            if ($instances->isEmpty()) {
                return response()->json([]);
            }


            // Get room data - filter out NULL and invalid UUIDs
            $roomIds = $instances->pluck('room_id')
                ->filter(function($id) {
                    if (empty($id)) return false;
                    // Validate UUID format
                    return preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $id);
                })
                ->unique();
            $rooms = [];
            if ($roomIds->isNotEmpty()) {
                $rooms = DB::table('rooms')
                    ->whereIn('id', $roomIds)
                    ->whereNull('deleted_at')
                    ->get()
                    ->keyBy('id');
            }

            $enriched = $instances->map(function ($instance) use ($academicYear, $rooms, $classes) {
                $class = $classes[$instance->class_id] ?? null;
                $room = $rooms[$instance->room_id ?? ''] ?? null;

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
                    'class' => $class ? [
                        'id' => $class->id,
                        'name' => $class->name,
                        'code' => $class->code,
                        'grade_level' => $class->grade_level,
                    ] : null,
                    'academic_year' => [
                        'id' => $academicYear->id,
                        'name' => $academicYear->name,
                        'start_date' => $academicYear->start_date,
                        'end_date' => $academicYear->end_date,
                    ],
                    'room' => $room ? [
                        'id' => $room->id,
                        'room_number' => $room->room_number,
                    ] : null,
                ];
            });

            return response()->json($enriched);

        } catch (\Exception $e) {
            Log::error('[ClassController::byAcademicYear] Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([]);
        }
    }
}


