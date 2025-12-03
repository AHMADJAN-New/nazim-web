<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\StudentDisciplineRecord;
use App\Http\Requests\StoreStudentDisciplineRecordRequest;
use App\Http\Requests\UpdateStudentDisciplineRecordRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StudentDisciplineRecordController extends Controller
{
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
     * Display a listing of discipline records for a student
     */
    public function index(Request $request, string $studentId)
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
            if (!$user->hasPermissionTo('student_discipline_records.read', $profile->organization_id)) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for student_discipline_records.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Check student exists and user has access
        $student = Student::whereNull('deleted_at')->find($studentId);
        if (!$student) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (!in_array($student->organization_id, $orgIds)) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        $records = StudentDisciplineRecord::with(['createdBy', 'resolvedBy'])
            ->where('student_id', $studentId)
            ->whereNull('deleted_at')
            ->orderBy('incident_date', 'desc')
            ->get();

        return response()->json($records);
    }

    /**
     * Store a newly created discipline record for a student
     */
    public function store(StoreStudentDisciplineRecordRequest $request, string $studentId)
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
            if (!$user->hasPermissionTo('student_discipline_records.create', $profile->organization_id)) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for student_discipline_records.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Check student exists and user has access
        $student = Student::whereNull('deleted_at')->find($studentId);
        if (!$student) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (!in_array($student->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot add record to student from different organization'], 403);
        }

        $validated = $request->validated();
        $validated['student_id'] = $studentId;
        $validated['organization_id'] = $student->organization_id;
        $validated['school_id'] = $validated['school_id'] ?? $student->school_id;
        $validated['severity'] = $validated['severity'] ?? 'minor';
        $validated['resolved'] = $validated['resolved'] ?? false;
        $validated['created_by'] = $user->id;

        $record = StudentDisciplineRecord::create($validated);
        $record->load(['createdBy', 'resolvedBy']);

        return response()->json($record, 201);
    }

    /**
     * Update the specified discipline record
     */
    public function update(UpdateStudentDisciplineRecordRequest $request, string $id)
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
            if (!$user->hasPermissionTo('student_discipline_records.update', $profile->organization_id)) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for student_discipline_records.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $record = StudentDisciplineRecord::whereNull('deleted_at')->find($id);

        if (!$record) {
            return response()->json(['error' => 'Discipline record not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (!in_array($record->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot update record from different organization'], 403);
        }

        $validated = $request->validated();
        unset($validated['organization_id']);

        $record->update($validated);
        $record->load(['createdBy', 'resolvedBy']);

        return response()->json($record);
    }

    /**
     * Remove the specified discipline record (soft delete)
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
            if (!$user->hasPermissionTo('student_discipline_records.delete', $profile->organization_id)) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for student_discipline_records.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $record = StudentDisciplineRecord::whereNull('deleted_at')->find($id);

        if (!$record) {
            return response()->json(['error' => 'Discipline record not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (!in_array($record->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot delete record from different organization'], 403);
        }

        $record->delete();

        return response()->json(['message' => 'Discipline record deleted successfully']);
    }

    /**
     * Mark a discipline record as resolved
     */
    public function resolve(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $record = StudentDisciplineRecord::whereNull('deleted_at')->find($id);

        if (!$record) {
            return response()->json(['error' => 'Discipline record not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (!in_array($record->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot resolve record from different organization'], 403);
        }

        $record->update([
            'resolved' => true,
            'resolved_date' => now()->toDateString(),
            'resolved_by' => $user->id,
        ]);

        $record->load(['createdBy', 'resolvedBy']);

        return response()->json($record);
    }
}

