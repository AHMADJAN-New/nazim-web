<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\StudentEducationalHistory;
use App\Http\Requests\StoreStudentEducationalHistoryRequest;
use App\Http\Requests\UpdateStudentEducationalHistoryRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StudentEducationalHistoryController extends Controller
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
     * Display a listing of educational history for a student
     */
    public function index(Request $request, string $studentId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        try {
            if (!$user->hasPermissionTo('students.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::error("Permission check failed for students.read: " . $e->getMessage());
            return response()->json(['error' => 'Permission check failed'], 500);
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

        $history = StudentEducationalHistory::with(['createdBy'])
            ->where('student_id', $studentId)
            ->whereNull('deleted_at')
            ->orderBy('start_date', 'desc')
            ->get();

        return response()->json($history);
    }

    /**
     * Store a newly created educational history for a student
     */
    public function store(StoreStudentEducationalHistoryRequest $request, string $studentId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        try {
            if (!$user->hasPermissionTo('students.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::error("Permission check failed for students.update: " . $e->getMessage());
            return response()->json(['error' => 'Permission check failed'], 500);
        }

        // Check student exists and user has access
        $student = Student::whereNull('deleted_at')->find($studentId);
        if (!$student) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (!in_array($student->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot add history to student from different organization'], 403);
        }

        $validated = $request->validated();
        $validated['student_id'] = $studentId;
        $validated['organization_id'] = $student->organization_id;
        $validated['school_id'] = $validated['school_id'] ?? $student->school_id;
        $validated['created_by'] = $user->id;

        $history = StudentEducationalHistory::create($validated);
        $history->load(['createdBy']);

        return response()->json($history, 201);
    }

    /**
     * Update the specified educational history
     */
    public function update(UpdateStudentEducationalHistoryRequest $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        try {
            if (!$user->hasPermissionTo('students.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::error("Permission check failed for students.update: " . $e->getMessage());
            return response()->json(['error' => 'Permission check failed'], 500);
        }

        $history = StudentEducationalHistory::whereNull('deleted_at')->find($id);

        if (!$history) {
            return response()->json(['error' => 'Educational history not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (!in_array($history->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot update history from different organization'], 403);
        }

        $validated = $request->validated();
        unset($validated['organization_id']);

        $history->update($validated);
        $history->load(['createdBy']);

        return response()->json($history);
    }

    /**
     * Remove the specified educational history (soft delete)
     */
    public function destroy(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        try {
            if (!$user->hasPermissionTo('students.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::error("Permission check failed for students.update: " . $e->getMessage());
            return response()->json(['error' => 'Permission check failed'], 500);
        }

        $history = StudentEducationalHistory::whereNull('deleted_at')->find($id);

        if (!$history) {
            return response()->json(['error' => 'Educational history not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (!in_array($history->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot delete history from different organization'], 403);
        }

        $history->delete();

        return response()->json(['message' => 'Educational history deleted successfully']);
    }
}

