<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\StudentEducationalHistory;
use App\Http\Requests\StoreStudentEducationalHistoryRequest;
use App\Http\Requests\UpdateStudentEducationalHistoryRequest;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StudentEducationalHistoryController extends Controller
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
     * Display a listing of educational history for a student
     */
    public function index(Request $request, string $studentId)
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
            if (!$user->hasPermissionTo('student_educational_history.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for student_educational_history.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Check student exists and user has access
        $student = Student::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($studentId);
        if (!$student) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        $history = StudentEducationalHistory::where('student_id', $studentId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
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
            if (!$user->hasPermissionTo('student_educational_history.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for student_educational_history.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Check student exists and user has access
        $student = Student::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($studentId);
        if (!$student) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        $validated = $request->validated();
        $validated['student_id'] = $studentId;
        $validated['organization_id'] = $profile->organization_id;
        $validated['school_id'] = $currentSchoolId;
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

        // Log educational history creation
        try {
            $studentName = $student->full_name ?? 'Unknown';
            $this->activityLogService->logCreate(
                subject: $history,
                description: "Created educational history for {$studentName}",
                properties: [
                    'history_id' => $history->id,
                    'student_id' => $studentId,
                    'institution_name' => $history->institution_name,
                    'start_date' => $history->start_date,
                    'end_date' => $history->end_date,
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log educational history creation: ' . $e->getMessage());
        }

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
            if (!$user->hasPermissionTo('student_educational_history.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for student_educational_history.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $history = StudentEducationalHistory::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$history) {
            return response()->json(['error' => 'Educational history not found'], 404);
        }

        $validated = $request->validated();
        unset($validated['organization_id'], $validated['school_id'], $validated['student_id'], $validated['created_by']);

        // Capture old values before update
        $oldValues = $history->only(['institution_name', 'start_date', 'end_date', 'degree', 'field_of_study']);

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

        // Log educational history update
        try {
            $student = Student::find($history->student_id);
            $studentName = $student?->full_name ?? 'Unknown';
            $this->activityLogService->logUpdate(
                subject: $history,
                description: "Updated educational history for {$studentName}",
                properties: [
                    'old_values' => $oldValues,
                    'new_values' => $history->only(['institution_name', 'start_date', 'end_date', 'degree', 'field_of_study']),
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log educational history update: ' . $e->getMessage());
        }

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
            if (!$user->hasPermissionTo('student_educational_history.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for student_educational_history.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId(request());

        $history = StudentEducationalHistory::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$history) {
            return response()->json(['error' => 'Educational history not found'], 404);
        }

        // Capture data before deletion
        $historyData = $history->toArray();
        $student = Student::find($history->student_id);
        $studentName = $student?->full_name ?? 'Unknown';

        $history->delete();

        // Log educational history deletion
        try {
            $this->activityLogService->logDelete(
                subject: $history,
                description: "Deleted educational history for {$studentName}",
                properties: ['deleted_history' => $historyData],
                request: request()
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log educational history deletion: ' . $e->getMessage());
        }

        return response()->noContent();
    }
}



