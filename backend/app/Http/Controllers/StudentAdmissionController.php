<?php

namespace App\Http\Controllers;

use App\Models\StudentAdmission;
use App\Models\Student;
use App\Http\Requests\StoreStudentAdmissionRequest;
use App\Http\Requests\UpdateStudentAdmissionRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StudentAdmissionController extends Controller
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
     * Display a listing of student admissions
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

        $query = StudentAdmission::with([
            'student:id,full_name,admission_no,gender,admission_year,guardian_phone',
            'organization',
            'school',
            'academicYear',
            'class',
            'classAcademicYear',
            'residencyType',
            'room'
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

        if ($request->has('student_id') && $request->student_id) {
            $query->where('student_id', $request->student_id);
        }

        if ($request->has('academic_year_id') && $request->academic_year_id) {
            $query->where('academic_year_id', $request->academic_year_id);
        }

        if ($request->has('class_id') && $request->class_id) {
            $query->where('class_id', $request->class_id);
        }

        if ($request->has('enrollment_status') && $request->enrollment_status) {
            $query->where('enrollment_status', $request->enrollment_status);
        }

        if ($request->has('is_boarder') && $request->is_boarder !== null) {
            $query->where('is_boarder', filter_var($request->is_boarder, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->has('residency_type_id') && $request->residency_type_id) {
            $query->where('residency_type_id', $request->residency_type_id);
        }

        if ($request->has('school_id') && $request->school_id) {
            $query->where('school_id', $request->school_id);
        }

        $admissions = $query->orderBy('admission_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($admissions);
    }

    /**
     * Display the specified student admission
     */
    public function show(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        try {
            if (!$user->hasPermissionTo('student_admissions.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::error("Permission check failed for student_admissions.read: " . $e->getMessage());
            return response()->json(['error' => 'Permission check failed'], 500);
        }

        $admission = StudentAdmission::with([
            'student',
            'organization',
            'school',
            'academicYear',
            'class',
            'classAcademicYear',
            'residencyType',
            'room'
        ])
            ->whereNull('deleted_at')
            ->find($id);

        if (!$admission) {
            return response()->json(['error' => 'Student admission not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (!in_array($admission->organization_id, $orgIds)) {
            return response()->json(['error' => 'Student admission not found'], 404);
        }

        return response()->json($admission);
    }

    /**
     * Store a newly created student admission
     */
    public function store(StoreStudentAdmissionRequest $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }


        $orgIds = $this->getAccessibleOrgIds($profile);

        // Get student to determine organization
        $student = Student::whereNull('deleted_at')->find($request->student_id);
        if (!$student) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        // Determine organization_id from student or request
        $organizationId = $request->organization_id ?? $student->organization_id ?? $profile->organization_id;
        if (!$organizationId) {
            return response()->json(['error' => 'Organization ID is required'], 422);
        }

        // Validate organization access
        if (!in_array($organizationId, $orgIds)) {
            return response()->json(['error' => 'Cannot create admission for this organization'], 403);
        }

        // Validate student belongs to organization
        if ($student->organization_id !== $organizationId) {
            return response()->json(['error' => 'Student organization mismatch'], 422);
        }

        $validated = $request->validated();
        $validated['organization_id'] = $organizationId;

        // Set defaults
        $validated['admission_date'] = $validated['admission_date'] ?? now()->toDateString();
        $validated['enrollment_status'] = $validated['enrollment_status'] ?? 'admitted';
        $validated['is_boarder'] = $validated['is_boarder'] ?? false;

        // Get school_id from student if not provided
        if (!isset($validated['school_id']) && $student->school_id) {
            $validated['school_id'] = $student->school_id;
        }

        $admission = StudentAdmission::create($validated);

        $admission->load([
            'student',
            'organization',
            'school',
            'academicYear',
            'class',
            'classAcademicYear',
            'residencyType',
            'room'
        ]);

        return response()->json($admission, 201);
    }

    /**
     * Update the specified student admission
     */
    public function update(UpdateStudentAdmissionRequest $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }


        $admission = StudentAdmission::whereNull('deleted_at')->find($id);

        if (!$admission) {
            return response()->json(['error' => 'Student admission not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (!in_array($admission->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot update admission from different organization'], 403);
        }

        $validated = $request->validated();
        
        // Remove organization_id from update data to prevent changes
        unset($validated['organization_id']);

        $admission->update($validated);
        $admission->load([
            'student',
            'organization',
            'school',
            'academicYear',
            'class',
            'classAcademicYear',
            'residencyType',
            'room'
        ]);

        return response()->json($admission);
    }

    /**
     * Remove the specified student admission (soft delete)
     */
    public function destroy(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }


        $admission = StudentAdmission::whereNull('deleted_at')->find($id);

        if (!$admission) {
            return response()->json(['error' => 'Student admission not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (!in_array($admission->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot delete admission from different organization'], 403);
        }

        $admission->delete();

        return response()->json(['message' => 'Student admission deleted successfully']);
    }

    /**
     * Get student admission statistics
     */
    public function stats(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (empty($orgIds)) {
            return response()->json([
                'total' => 0,
                'active' => 0,
                'pending' => 0,
                'boarders' => 0,
            ]);
        }

        $query = StudentAdmission::whereNull('deleted_at')
            ->whereIn('organization_id', $orgIds);

        // Apply organization filter if provided
        if ($request->has('organization_id') && $request->organization_id) {
            if (in_array($request->organization_id, $orgIds)) {
                $query->where('organization_id', $request->organization_id);
            } else {
                return response()->json([
                    'total' => 0,
                    'active' => 0,
                    'pending' => 0,
                    'boarders' => 0,
                ]);
            }
        }

        $total = (clone $query)->count();
        $active = (clone $query)->where('enrollment_status', 'active')->count();
        $pending = (clone $query)->whereIn('enrollment_status', ['pending', 'admitted'])->count();
        $boarders = (clone $query)->where('is_boarder', true)->count();

        return response()->json([
            'total' => $total,
            'active' => $active,
            'pending' => $pending,
            'boarders' => $boarders,
        ]);
    }
}

