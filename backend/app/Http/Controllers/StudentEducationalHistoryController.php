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
        // All users are restricted to their own organization
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

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('student_educational_history.read', $profile->organization_id)) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for student_educational_history.read: " . $e->getMessage());
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

        $history = StudentEducationalHistory::where('student_id', $studentId)
            ->whereNull('deleted_at')
            ->orderBy('start_date', 'desc')
            ->get();

        // Enrich with created_by profile data manually to avoid relationship issues
        $createdByIds = $history->pluck('created_by')->filter()->unique()->toArray();
        $profiles = [];
        if (!empty($createdByIds)) {
            $profiles = DB::table('profiles')
                ->whereIn('id', $createdByIds)
                ->select('id', 'full_name', 'email')
                ->get()
                ->keyBy('id');
        }

        $enrichedHistory = $history->map(function ($item) use ($profiles) {
            $createdByProfile = $profiles->get($item->created_by);
            return [
                ...$item->toArray(),
                'created_by_profile' => $createdByProfile ? [
                    'id' => $createdByProfile->id,
                    'full_name' => $createdByProfile->full_name,
                    'email' => $createdByProfile->email,
                ] : null,
            ];
        });

        return response()->json($enrichedHistory);
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

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('student_educational_history.create', $profile->organization_id)) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for student_educational_history.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
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

        // Enrich with created_by profile data
        $createdByProfile = DB::table('profiles')
            ->where('id', $user->id)
            ->select('id', 'full_name', 'email')
            ->first();

        $historyArray = $history->toArray();
        $historyArray['created_by_profile'] = $createdByProfile ? [
            'id' => $createdByProfile->id,
            'full_name' => $createdByProfile->full_name,
            'email' => $createdByProfile->email,
        ] : null;

        return response()->json($historyArray, 201);
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

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('student_educational_history.update', $profile->organization_id)) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for student_educational_history.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
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

        // Enrich with created_by profile data
        $createdByProfile = DB::table('profiles')
            ->where('id', $history->created_by)
            ->select('id', 'full_name', 'email')
            ->first();

        $historyArray = $history->toArray();
        $historyArray['created_by_profile'] = $createdByProfile ? [
            'id' => $createdByProfile->id,
            'full_name' => $createdByProfile->full_name,
            'email' => $createdByProfile->email,
        ] : null;

        return response()->json($historyArray);
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

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('student_educational_history.delete', $profile->organization_id)) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for student_educational_history.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
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

