<?php

namespace App\Http\Controllers;

use App\Models\Exam;
use App\Models\AcademicYear;
use App\Models\GraduationBatch;
use App\Services\Notifications\NotificationService;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class ExamController extends Controller
{
    public function __construct(
        private NotificationService $notificationService,
        private ActivityLogService $activityLogService
    ) {
    }
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
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $this->getCurrentSchoolId($request));

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
        $currentSchoolId = $this->getCurrentSchoolId($request);
        if (!$academicYear || $academicYear->organization_id !== $profile->organization_id || $academicYear->school_id !== $currentSchoolId) {
            return response()->json(['error' => 'Academic year does not belong to your school'], 403);
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
            'school_id' => $currentSchoolId,
        ]);

        $exam->load(['academicYear']);

        // Notify about exam creation
        try {
            $academicYearName = $exam->academicYear?->name ?? 'Academic Year';
            $this->notificationService->notify(
                'exam.created',
                $exam,
                $user,
                [
                    'title' => '📝 New Exam Created',
                    'body' => "Exam '{$exam->name}' has been created for {$academicYearName}.",
                    'url' => "/exams/{$exam->id}",
                ]
            );
        } catch (\Exception $e) {
            Log::warning('Failed to send exam creation notification', [
                'exam_id' => $exam->id,
                'error' => $e->getMessage(),
            ]);
        }

        // Log exam creation
        try {
            $this->activityLogService->logCreate(
                subject: $exam,
                description: "Created exam: {$exam->name}",
                properties: [
                    'exam_id' => $exam->id,
                    'name' => $exam->name,
                    'academic_year_id' => $exam->academic_year_id,
                    'status' => $exam->status,
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log exam creation: ' . $e->getMessage());
        }

        return response()->json($exam, 201);
    }

    /**
     * Get a specific exam
     */
    public function show(Request $request, string $id)
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
            $exam = Exam::with(['academicYear', 'examClasses.classAcademicYear.class'])
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $this->getCurrentSchoolId($request))
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

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
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
            if (!$academicYear || $academicYear->organization_id !== $profile->organization_id || $academicYear->school_id !== $currentSchoolId) {
                return response()->json(['error' => 'Academic year does not belong to your school'], 403);
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

        // Track old status for status change notification
        $oldStatus = $exam->status;
        
        // Capture old values before update
        $oldValues = $exam->only(['name', 'academic_year_id', 'description', 'start_date', 'end_date', 'status']);
        
        $exam->fill($validated);
        $exam->save();

        $exam->load(['academicYear']);

        // Notify if exam is published (status changed to scheduled) or marks published (status changed to completed)
        try {
            if (isset($validated['status'])) {
                if ($validated['status'] === Exam::STATUS_SCHEDULED && $oldStatus !== Exam::STATUS_SCHEDULED) {
                    $academicYearName = $exam->academicYear?->name ?? 'Academic Year';
                    $this->notificationService->notify(
                        'exam.published',
                        $exam,
                        $user,
                        [
                            'title' => '📢 Exam Published',
                            'body' => "Exam '{$exam->name}' has been published and is now visible to students.",
                            'url' => "/exams/{$exam->id}",
                        ]
                    );
                }

                if ($validated['status'] === Exam::STATUS_COMPLETED && $oldStatus !== Exam::STATUS_COMPLETED) {
                    $academicYearName = $exam->academicYear?->name ?? 'Academic Year';
                    $this->notificationService->notify(
                        'exam.marks_published',
                        $exam,
                        $user,
                        [
                            'title' => '✅ Exam Results Published',
                            'body' => "Results for exam '{$exam->name}' are now available.",
                            'url' => "/exams/{$exam->id}/results",
                        ]
                    );
                }
            }
        } catch (\Exception $e) {
            Log::warning('Failed to send exam notification', [
                'exam_id' => $exam->id,
                'error' => $e->getMessage(),
            ]);
        }

        // Log exam update
        try {
            $this->activityLogService->logUpdate(
                subject: $exam,
                description: "Updated exam: {$exam->name}",
                properties: [
                    'old_values' => $oldValues,
                    'new_values' => $exam->only(['name', 'academic_year_id', 'description', 'start_date', 'end_date', 'status']),
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log exam update: ' . $e->getMessage());
        }

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

        $currentSchoolId = request()->get('current_school_id');
        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
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

        // Capture data before deletion
        $examData = $exam->toArray();
        $examName = $exam->name;

        $exam->delete();

        // Log exam deletion
        try {
            $this->activityLogService->logDelete(
                subject: $exam,
                description: "Deleted exam: {$examName}",
                properties: ['deleted_exam' => $examData],
                request: request()
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log exam deletion: ' . $e->getMessage());
        }

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

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
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

        // Prevent rolling back from completed status if graduation batches exist
        if ($exam->status === Exam::STATUS_COMPLETED && $newStatus !== Exam::STATUS_COMPLETED) {
            $graduationBatchCount = GraduationBatch::where('exam_id', $exam->id)
                ->whereNull('deleted_at')
                ->count();

            if ($graduationBatchCount > 0) {
                return response()->json([
                    'error' => 'Cannot change exam status because graduation batches have been created for this exam',
                    'graduation_batch_count' => $graduationBatchCount,
                    'message' => 'Delete all graduation batches first before changing exam status'
                ], 422);
            }
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

        $oldStatus = $exam->status;
        $exam->status = $newStatus;
        $exam->save();

        // Log exam status change
        try {
            $this->activityLogService->logEvent(
                subject: $exam,
                description: "Changed exam status: {$exam->name} from {$oldStatus} to {$newStatus}",
                properties: [
                    'exam_id' => $exam->id,
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log exam status change: ' . $e->getMessage());
        }

        $exam->load(['academicYear']);

        // Notify if exam is published (status changed to scheduled)
        try {
            if ($newStatus === Exam::STATUS_SCHEDULED && $oldStatus !== Exam::STATUS_SCHEDULED) {
                $academicYearName = $exam->academicYear?->name ?? 'Academic Year';
                $this->notificationService->notify(
                    'exam.published',
                    $exam,
                    $user,
                    [
                        'title' => '📢 Exam Published',
                        'body' => "Exam '{$exam->name}' has been published and is now visible to students.",
                        'url' => "/exams/{$exam->id}",
                    ]
                );
            }

            // Notify when marks are published (status changed to completed)
            if ($newStatus === Exam::STATUS_COMPLETED && $oldStatus !== Exam::STATUS_COMPLETED) {
                $academicYearName = $exam->academicYear?->name ?? 'Academic Year';
                $this->notificationService->notify(
                    'exam.marks_published',
                    $exam,
                    $user,
                    [
                        'title' => '✅ Exam Results Published',
                        'body' => "Results for exam '{$exam->name}' are now available.",
                        'url' => "/exams/{$exam->id}/results",
                    ]
                );
            }
        } catch (\Exception $e) {
            Log::warning('Failed to send exam notification', [
                'exam_id' => $exam->id,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'message' => "Exam status changed to '{$newStatus}'",
            'exam' => $exam
        ]);
    }
}
