<?php

namespace App\Http\Controllers;

use App\Models\Exam;
use App\Models\AcademicYear;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class ExamController extends Controller
{
    /**
     * Get all exams for the organization
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exams.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        try {
            $query = Exam::with(['academicYear'])
                ->whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id);

            // Filter by academic year
            if ($request->filled('academic_year_id')) {
                $query->where('academic_year_id', $request->academic_year_id);
            }

            // Filter by status
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            $exams = $query->orderBy('created_at', 'desc')->get();

            return response()->json($exams);
        } catch (\Exception $e) {
            Log::error('Error fetching exams: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'user_id' => $user->id,
                'organization_id' => $profile->organization_id,
            ]);
            return response()->json(['error' => 'Failed to fetch exams: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Create a new exam
     */
    public function store(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exams.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'academic_year_id' => 'required|uuid|exists:academic_years,id',
            'description' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'status' => ['nullable', 'string', Rule::in(Exam::STATUSES)],
        ]);

        // Validate academic year belongs to organization
        $academicYear = AcademicYear::find($validated['academic_year_id']);
        if ($academicYear && $academicYear->organization_id && $academicYear->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Academic year does not belong to your organization'], 403);
        }

        // Validate date range consistency
        if (!empty($validated['start_date']) && !empty($validated['end_date'])) {
            $startDate = \Carbon\Carbon::parse($validated['start_date']);
            $endDate = \Carbon\Carbon::parse($validated['end_date']);
            if ($endDate->lt($startDate)) {
                return response()->json(['error' => 'End date must be on or after start date'], 422);
            }
        }

        $exam = Exam::create([
            'name' => $validated['name'],
            'academic_year_id' => $validated['academic_year_id'],
            'description' => $validated['description'] ?? null,
            'start_date' => $validated['start_date'] ?? null,
            'end_date' => $validated['end_date'] ?? null,
            'status' => $validated['status'] ?? Exam::STATUS_DRAFT,
            'organization_id' => $profile->organization_id,
        ]);

        $exam->load(['academicYear']);

        return response()->json($exam, 201);
    }

    /**
     * Get a specific exam
     */
    public function show(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exams.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        try {
            $exam = Exam::with(['academicYear', 'examClasses.classAcademicYear.class'])
                ->where('organization_id', $profile->organization_id)
                ->where('id', $id)
                ->whereNull('deleted_at')
                ->first();
        } catch (\Exception $e) {
            Log::error('Error fetching exam: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'exam_id' => $id,
                'user_id' => $user->id,
            ]);
            return response()->json(['error' => 'Failed to fetch exam: ' . $e->getMessage()], 500);
        }

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        return response()->json($exam);
    }

    /**
     * Update an exam
     */
    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exams.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        // Check if exam is in a locked state
        if ($exam->isConfigurationLocked()) {
            return response()->json([
                'error' => 'Cannot modify a completed or archived exam',
                'status' => $exam->status
            ], 422);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'academic_year_id' => 'sometimes|required|uuid|exists:academic_years,id',
            'description' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'status' => ['sometimes', 'string', Rule::in(Exam::STATUSES)],
        ]);

        // Validate academic year if being changed
        if (isset($validated['academic_year_id'])) {
            $academicYear = AcademicYear::find($validated['academic_year_id']);
            if ($academicYear && $academicYear->organization_id && $academicYear->organization_id !== $profile->organization_id) {
                return response()->json(['error' => 'Academic year does not belong to your organization'], 403);
            }
        }

        // Validate date range
        $startDate = $validated['start_date'] ?? $exam->start_date;
        $endDate = $validated['end_date'] ?? $exam->end_date;
        
        if ($startDate && $endDate) {
            $start = \Carbon\Carbon::parse($startDate);
            $end = \Carbon\Carbon::parse($endDate);
            if ($end->lt($start)) {
                return response()->json(['error' => 'End date must be on or after start date'], 422);
            }
        }

        // Validate status transition if status is being changed
        if (isset($validated['status']) && $validated['status'] !== $exam->status) {
            if (!$exam->canTransitionTo($validated['status'])) {
                return response()->json([
                    'error' => "Cannot transition from '{$exam->status}' to '{$validated['status']}'",
                    'allowed_transitions' => Exam::getStatusTransitionRules()[$exam->status] ?? []
                ], 422);
            }
        }

        $exam->fill($validated);
        $exam->save();

        $exam->load(['academicYear']);

        return response()->json($exam);
    }

    /**
     * Delete an exam
     */
    public function destroy(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exams.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        // Block deletion if exam has results
        if ($exam->hasResults()) {
            return response()->json([
                'error' => 'Cannot delete an exam that has results entered. Please delete the results first or archive the exam.',
                'has_results' => true
            ], 422);
        }

        // Block deletion if exam has timetable and is not draft
        if ($exam->hasTimetable() && $exam->status !== Exam::STATUS_DRAFT) {
            return response()->json([
                'error' => 'Cannot delete an exam with scheduled timetable. Please delete the timetable first or archive the exam.',
                'has_timetable' => true
            ], 422);
        }

        // Block deletion if exam is completed or archived
        if ($exam->isConfigurationLocked()) {
            return response()->json([
                'error' => 'Cannot delete a completed or archived exam',
                'status' => $exam->status
            ], 422);
        }

        $exam->delete();

        return response()->noContent();
    }

    /**
     * Change exam status (dedicated endpoint for status transitions)
     */
    public function updateStatus(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exams.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(Exam::STATUSES)],
        ]);

        $newStatus = $validated['status'];

        // Validate transition
        if (!$exam->canTransitionTo($newStatus)) {
            return response()->json([
                'error' => "Cannot transition from '{$exam->status}' to '{$newStatus}'",
                'current_status' => $exam->status,
                'allowed_transitions' => Exam::getStatusTransitionRules()[$exam->status] ?? []
            ], 422);
        }

        // Additional validation for specific transitions
        if ($newStatus === Exam::STATUS_SCHEDULED) {
            // Require start and end dates for scheduling
            if (!$exam->start_date || !$exam->end_date) {
                return response()->json([
                    'error' => 'Cannot schedule exam without start and end dates',
                    'missing_fields' => [
                        'start_date' => !$exam->start_date,
                        'end_date' => !$exam->end_date,
                    ]
                ], 422);
            }
        }

        if ($newStatus === Exam::STATUS_IN_PROGRESS) {
            // Check if exam has classes and subjects assigned
            $classCount = $exam->examClasses()->whereNull('deleted_at')->count();
            $subjectCount = $exam->examSubjects()->whereNull('deleted_at')->count();
            
            if ($classCount === 0) {
                return response()->json([
                    'error' => 'Cannot start exam without any classes assigned',
                    'class_count' => 0
                ], 422);
            }
            
            if ($subjectCount === 0) {
                return response()->json([
                    'error' => 'Cannot start exam without any subjects assigned',
                    'subject_count' => 0
                ], 422);
            }
        }

        $exam->status = $newStatus;
        $exam->save();

        $exam->load(['academicYear']);

        return response()->json([
            'message' => "Exam status changed to '{$newStatus}'",
            'exam' => $exam
        ]);
    }
}
