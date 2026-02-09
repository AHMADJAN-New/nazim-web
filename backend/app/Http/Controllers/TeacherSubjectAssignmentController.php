<?php

namespace App\Http\Controllers;

use App\Models\TeacherSubjectAssignment;
use App\Http\Requests\StoreTeacherSubjectAssignmentRequest;
use App\Http\Requests\UpdateTeacherSubjectAssignmentRequest;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TeacherSubjectAssignmentController extends Controller
{
    public function __construct(
        private ActivityLogService $activityLogService
    ) {}
    /**
     * Get accessible organization IDs for the current user
     */
    private function getAccessibleOrgIds($profile): array
    {
        // All users are restricted to their own organization
        if ($profile->organization_id) {
            return [$profile->organization_id];
        }

        return [];
    }

    /**
     * Display a listing of teacher subject assignments
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('teacher_subject_assignments.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for teacher_subject_assignments.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (empty($orgIds)) {
            return response()->json([]);
        }

        $query = TeacherSubjectAssignment::with([
            'teacher:id,employee_id,first_name,father_name,grandfather_name,email,staff_type_id',
            'teacher.staffType:id,name,code',
            'subject:id,name,code',
            'classAcademicYear:id,class_id,academic_year_id,section_name',
            'classAcademicYear.class:id,name,code',
            'academicYear:id,name',
            'school:id,school_name',
            'organization:id,name',
        ])
            ->whereNull('deleted_at')
            ->whereIn('organization_id', $orgIds)
            ->where('school_id', $currentSchoolId);

        // Client-provided organization_id is ignored; organization is derived from profile.

        if ($request->has('teacher_id') && $request->teacher_id) {
            $query->where('teacher_id', $request->teacher_id);
        }

        if ($request->has('academic_year_id') && $request->academic_year_id) {
            $query->where('academic_year_id', $request->academic_year_id);
        }

        // Support pagination if page and per_page parameters are provided
        if ($request->has('page') || $request->has('per_page')) {
            $perPage = $request->input('per_page', 25);
            // Validate per_page is one of allowed values
            $allowedPerPage = [10, 25, 50, 100];
            if (!in_array((int)$perPage, $allowedPerPage)) {
                $perPage = 25; // Default to 25 if invalid
            }
            
            $assignments = $query->orderBy('created_at', 'desc')
                ->paginate((int)$perPage);
            
            // Return paginated response in Laravel's standard format
            return response()->json($assignments);
        }

        // Return all results if no pagination requested (backward compatibility)
        $assignments = $query->orderBy('created_at', 'desc')
            ->get();

        return response()->json($assignments);
    }

    /**
     * Display the specified teacher subject assignment
     */
    public function show(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $currentSchoolId = $this->getCurrentSchoolId(request());

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('teacher_subject_assignments.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for teacher_subject_assignments.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $assignment = TeacherSubjectAssignment::with([
            'teacher:id,employee_id,first_name,father_name,grandfather_name,email,staff_type_id',
            'teacher.staffType:id,name,code',
            'subject:id,name,code',
            'classAcademicYear:id,class_id,academic_year_id,section_name',
            'classAcademicYear.class:id,name,code',
            'academicYear:id,name',
            'school:id,school_name',
            'organization:id,name',
        ])
            ->whereNull('deleted_at')
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$assignment) {
            return response()->json(['error' => 'Teacher subject assignment not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (!in_array($assignment->organization_id, $orgIds)) {
            return response()->json(['error' => 'Teacher subject assignment not found'], 404);
        }

        return response()->json($assignment);
    }

    /**
     * Store a newly created teacher subject assignment
     */
    public function store(StoreTeacherSubjectAssignmentRequest $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('teacher_subject_assignments.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for teacher_subject_assignments.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        // Strict scoping: organization comes from profile
        $organizationId = $profile->organization_id;

        // Validate organization access
        if (!in_array($organizationId, $orgIds)) {
            return response()->json(['error' => 'Cannot create assignment for this organization'], 403);
        }

        $validated = $request->validated();
        $validated['organization_id'] = $organizationId;
        $validated['school_id'] = $currentSchoolId;

        // Never trust client-provided school_id
        if (array_key_exists('school_id', $validated)) {
            $validated['school_id'] = $currentSchoolId;
        }

        // Ensure schedule_slot_ids is an array
        if (isset($validated['schedule_slot_ids']) && !is_array($validated['schedule_slot_ids'])) {
            $validated['schedule_slot_ids'] = [];
        }

        try {
            $assignment = TeacherSubjectAssignment::create($validated);

            // Load relations
            $assignment->load([
                'teacher:id,employee_id,first_name,father_name,grandfather_name,email,staff_type_id',
                'teacher.staffType:id,name,code',
                'subject:id,name,code',
                'classAcademicYear:id,class_id,academic_year_id,section_name',
                'classAcademicYear.class:id,name,code',
                'academicYear:id,name',
                'school:id,school_name',
                'organization:id,name',
            ]);

            // Log teacher subject assignment creation
            try {
                $teacherName = $assignment->teacher?->first_name ?? 'Unknown';
                $subjectName = $assignment->subject?->name ?? 'Unknown';
                $this->activityLogService->logCreate(
                    subject: $assignment,
                    description: "Assigned teacher {$teacherName} to subject {$subjectName}",
                    properties: [
                        'assignment_id' => $assignment->id,
                        'teacher_id' => $assignment->teacher_id,
                        'subject_id' => $assignment->subject_id,
                        'class_academic_year_id' => $assignment->class_academic_year_id,
                    ],
                    request: $request
                );
            } catch (\Exception $e) {
                Log::warning('Failed to log teacher subject assignment creation: ' . $e->getMessage());
            }

            return response()->json($assignment, 201);
        } catch (\Exception $e) {
            Log::error('Error creating teacher subject assignment: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to create teacher subject assignment'], 500);
        }
    }

    /**
     * Update the specified teacher subject assignment
     */
    public function update(UpdateTeacherSubjectAssignmentRequest $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('teacher_subject_assignments.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for teacher_subject_assignments.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $assignment = TeacherSubjectAssignment::whereNull('deleted_at')
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$assignment) {
            return response()->json(['error' => 'Teacher subject assignment not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (!in_array($assignment->organization_id, $orgIds)) {
            return response()->json(['error' => 'Teacher subject assignment not found'], 404);
        }

        $validated = $request->validated();
        unset($validated['organization_id'], $validated['school_id']);

        // Ensure schedule_slot_ids is an array if provided
        if (isset($validated['schedule_slot_ids']) && !is_array($validated['schedule_slot_ids'])) {
            $validated['schedule_slot_ids'] = [];
        }

        // Capture old values before update
        $oldValues = $assignment->only(['teacher_id', 'subject_id', 'class_academic_year_id', 'academic_year_id', 'schedule_slot_ids']);

        try {
            $assignment->update($validated);

            // Load relations
            $assignment->load([
                'teacher:id,employee_id,first_name,father_name,grandfather_name,email,staff_type_id',
                'teacher.staffType:id,name,code',
                'subject:id,name,code',
                'classAcademicYear:id,class_id,academic_year_id,section_name',
                'classAcademicYear.class:id,name,code',
                'academicYear:id,name',
                'school:id,school_name',
                'organization:id,name',
            ]);

            // Log teacher subject assignment update
            try {
                $teacherName = $assignment->teacher?->first_name ?? 'Unknown';
                $subjectName = $assignment->subject?->name ?? 'Unknown';
                $this->activityLogService->logUpdate(
                    subject: $assignment,
                    description: "Updated teacher assignment: {$teacherName} to subject {$subjectName}",
                    properties: [
                        'old_values' => $oldValues,
                        'new_values' => $assignment->only(['teacher_id', 'subject_id', 'class_academic_year_id', 'academic_year_id', 'schedule_slot_ids']),
                    ],
                    request: $request
                );
            } catch (\Exception $e) {
                Log::warning('Failed to log teacher subject assignment update: ' . $e->getMessage());
            }

            return response()->json($assignment);
        } catch (\Exception $e) {
            Log::error('Error updating teacher subject assignment: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to update teacher subject assignment'], 500);
        }
    }

    /**
     * Remove the specified teacher subject assignment
     */
    public function destroy(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $currentSchoolId = $this->getCurrentSchoolId(request());

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('teacher_subject_assignments.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for teacher_subject_assignments.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $assignment = TeacherSubjectAssignment::whereNull('deleted_at')
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$assignment) {
            return response()->json(['error' => 'Teacher subject assignment not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (!in_array($assignment->organization_id, $orgIds)) {
            return response()->json(['error' => 'Teacher subject assignment not found'], 404);
        }

        try {
            // Capture data before deletion
            $assignmentData = $assignment->toArray();
            $teacherName = $assignment->teacher?->first_name ?? 'Unknown';
            $subjectName = $assignment->subject?->name ?? 'Unknown';

            $assignment->delete(); // Soft delete

            // Log teacher subject assignment deletion
            try {
                $this->activityLogService->logDelete(
                    subject: $assignment,
                    description: "Removed teacher assignment: {$teacherName} from subject {$subjectName}",
                    properties: ['deleted_assignment' => $assignmentData],
                    request: request()
                );
            } catch (\Exception $e) {
                Log::warning('Failed to log teacher subject assignment deletion: ' . $e->getMessage());
            }

            return response()->noContent();
        } catch (\Exception $e) {
            Log::error('Error deleting teacher subject assignment: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to delete teacher subject assignment'], 500);
        }
    }
}



