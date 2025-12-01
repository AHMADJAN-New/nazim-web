<?php

namespace App\Http\Controllers;

use App\Models\TeacherSubjectAssignment;
use App\Http\Requests\StoreTeacherSubjectAssignmentRequest;
use App\Http\Requests\UpdateTeacherSubjectAssignmentRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TeacherSubjectAssignmentController extends Controller
{
    /**
     * Get accessible organization IDs for the current user
     */
    private function getAccessibleOrgIds($profile): array
    {
        if ($profile->role === 'super_admin' && $profile->organization_id === null) {
            return DB::table('organizations')
                ->whereNull('deleted_at')
                ->pluck('id')
                ->toArray();
        }
        
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
            ->whereIn('organization_id', $orgIds);

        // Apply filters
        if ($request->has('organization_id') && $request->organization_id) {
            if (in_array($request->organization_id, $orgIds)) {
                $query->where('organization_id', $request->organization_id);
            } else {
                return response()->json([]);
            }
        }

        if ($request->has('teacher_id') && $request->teacher_id) {
            $query->where('teacher_id', $request->teacher_id);
        }

        if ($request->has('academic_year_id') && $request->academic_year_id) {
            $query->where('academic_year_id', $request->academic_year_id);
        }

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

        $orgIds = $this->getAccessibleOrgIds($profile);

        // Get organization_id from request or class_academic_year
        $organizationId = $request->organization_id;
        if (!$organizationId) {
            // Get from class_academic_year
            $classAcademicYear = DB::table('class_academic_years')
                ->where('id', $request->class_academic_year_id)
                ->whereNull('deleted_at')
                ->first();
            
            if ($classAcademicYear) {
                $organizationId = $classAcademicYear->organization_id;
            }
        }

        if (!$organizationId) {
            return response()->json(['error' => 'Organization ID is required'], 422);
        }

        // Validate organization access
        if (!in_array($organizationId, $orgIds)) {
            return response()->json(['error' => 'Cannot create assignment for this organization'], 403);
        }

        $validated = $request->validated();
        $validated['organization_id'] = $organizationId;

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

        $assignment = TeacherSubjectAssignment::whereNull('deleted_at')->find($id);

        if (!$assignment) {
            return response()->json(['error' => 'Teacher subject assignment not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (!in_array($assignment->organization_id, $orgIds)) {
            return response()->json(['error' => 'Teacher subject assignment not found'], 404);
        }

        $validated = $request->validated();

        // Ensure schedule_slot_ids is an array if provided
        if (isset($validated['schedule_slot_ids']) && !is_array($validated['schedule_slot_ids'])) {
            $validated['schedule_slot_ids'] = [];
        }

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

        $assignment = TeacherSubjectAssignment::whereNull('deleted_at')->find($id);

        if (!$assignment) {
            return response()->json(['error' => 'Teacher subject assignment not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (!in_array($assignment->organization_id, $orgIds)) {
            return response()->json(['error' => 'Teacher subject assignment not found'], 404);
        }

        try {
            $assignment->delete(); // Soft delete

            return response()->json(['message' => 'Teacher subject assignment deleted successfully']);
        } catch (\Exception $e) {
            Log::error('Error deleting teacher subject assignment: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to delete teacher subject assignment'], 500);
        }
    }
}

