<?php

namespace App\Http\Controllers;

use App\Models\ClassSubject;
use App\Models\Exam;
use App\Models\ExamClass;
use App\Models\ExamSubject;
use App\Models\ExamTime;
use App\Services\ActivityLogService;
use App\Services\ExamSubjectScheduleService;
use App\Services\Notifications\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ExamTimeController extends Controller
{
    public function __construct(
        private ActivityLogService $activityLogService,
        private NotificationService $notificationService,
        private ExamSubjectScheduleService $examSubjectScheduleService
    ) {}

    /**
     * Get all exam times for an exam
     */
    public function index(Request $request, string $examId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('exams.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for exams.read: '.$e->getMessage());

            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Verify exam exists and belongs to organization
        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $query = ExamTime::with([
            'examClass.classAcademicYear.class',
            'examSubject.subject',
            'room',
            'invigilator',
        ])
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('exam_id', $examId)
            ->whereNull('deleted_at');

        // Optional filters
        if ($request->filled('exam_class_id')) {
            $query->where('exam_class_id', $request->exam_class_id);
        }

        if ($request->filled('date')) {
            $query->whereDate('date', $request->date);
        }

        if ($request->filled('room_id')) {
            $query->where('room_id', $request->room_id);
        }

        $examTimes = $query->orderBy('date', 'asc')
            ->orderBy('start_time', 'asc')
            ->orderBy('sort_order', 'asc')
            ->get();

        return response()->json($examTimes);
    }

    /**
     * Create a new exam time slot
     */
    public function store(Request $request, string $examId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('exams.manage_timetable')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for exams.manage_timetable: '.$e->getMessage());

            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Verify exam exists and belongs to organization
        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        // Check if exam can be modified
        if ($exam->isConfigurationLocked()) {
            return response()->json([
                'error' => 'Cannot add timetable to a completed or archived exam',
                'status' => $exam->status,
            ], 422);
        }

        $this->normalizeClockFields($request);

        $validated = $request->validate([
            'exam_class_id' => 'required|uuid|exists:exam_classes,id',
            'exam_subject_id' => 'nullable|uuid|exists:exam_subjects,id',
            'class_subject_id' => 'nullable|uuid|exists:class_subjects,id',
            'date' => 'required|date',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'room_id' => 'nullable|uuid|exists:rooms,id',
            'invigilator_id' => 'nullable|uuid|exists:staff,id',
            'notes' => 'nullable|string|max:1000',
            'sort_order' => 'nullable|integer|min:0|max:10000',
        ]);

        if (empty($validated['exam_subject_id']) && empty($validated['class_subject_id'])) {
            return response()->json(['error' => 'A class subject is required'], 422);
        }

        // Verify exam_class belongs to this exam
        $examClass = ExamClass::where('id', $validated['exam_class_id'])
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (! $examClass) {
            return response()->json(['error' => 'Exam class does not belong to this exam'], 422);
        }

        $examSubject = $this->resolveExamSubject(
            $exam,
            $examClass,
            $profile->organization_id,
            $currentSchoolId,
            $validated['exam_subject_id'] ?? null,
            $validated['class_subject_id'] ?? null,
        );

        if ($examSubject instanceof \Illuminate\Http\JsonResponse) {
            return $examSubject;
        }

        $validated['exam_subject_id'] = $examSubject->id;

        // Validate date is within exam period
        if (! $exam->isDateWithinPeriod($validated['date'])) {
            return response()->json([
                'error' => 'Date must be within the exam period',
                'exam_start_date' => $exam->start_date?->format('Y-m-d'),
                'exam_end_date' => $exam->end_date?->format('Y-m-d'),
            ], 422);
        }

        // Validate end_time > start_time
        $startTime = \Carbon\Carbon::createFromFormat('H:i', $validated['start_time']);
        $endTime = \Carbon\Carbon::createFromFormat('H:i', $validated['end_time']);
        if ($endTime->lte($startTime)) {
            return response()->json(['error' => 'End time must be after start time'], 422);
        }

        if (! empty($validated['room_id'])) {
            $roomConflict = $this->findRoomConflict(
                $profile->organization_id,
                $currentSchoolId,
                $validated['room_id'],
                $validated['date'],
                $validated['start_time'],
                $validated['end_time'],
                $validated['exam_class_id'],
            );

            if ($roomConflict) {
                return response()->json([
                    'error' => 'Room is already booked during this time slot',
                    'conflict' => [
                        'date' => $roomConflict->date,
                        'start_time' => $roomConflict->start_time,
                        'end_time' => $roomConflict->end_time,
                    ],
                ], 422);
            }
        }

        // Check for duplicate subject scheduling on same date/time
        $duplicateSubject = ExamTime::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('exam_subject_id', $validated['exam_subject_id'])
            ->whereDate('date', $validated['date'])
            ->where('start_time', $validated['start_time'])
            ->whereNull('deleted_at')
            ->exists();

        if ($duplicateSubject) {
            return response()->json([
                'error' => 'This subject is already scheduled at this date and time',
            ], 422);
        }

        $examTime = ExamTime::create([
            'organization_id' => $profile->organization_id,
            'school_id' => $currentSchoolId,
            'exam_id' => $examId,
            'exam_class_id' => $validated['exam_class_id'],
            'exam_subject_id' => $validated['exam_subject_id'],
            'date' => $validated['date'],
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'room_id' => $validated['room_id'] ?? null,
            'invigilator_id' => $validated['invigilator_id'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'is_locked' => false,
            'sort_order' => $validated['sort_order'] ?? $this->nextSortOrder(
                $profile->organization_id,
                $currentSchoolId,
                $validated['exam_class_id'],
                $validated['date'],
                $validated['start_time'],
                $validated['end_time'],
            ),
        ]);

        $examTime->load([
            'examClass.classAcademicYear.class',
            'examSubject.subject',
            'room',
            'invigilator',
            'exam',
        ]);

        // Notify about timetable update
        try {
            $exam = $examTime->exam;
            if ($exam) {
                $this->notificationService->notify(
                    'exam.timetable_updated',
                    $exam,
                    $user,
                    [
                        'title' => '📅 Exam Timetable Updated',
                        'body' => "Timetable for exam '{$exam->name}' has been updated.",
                        'url' => "/exams/{$exam->id}/timetable",
                    ]
                );
            }
        } catch (\Exception $e) {
            Log::warning('Failed to send exam timetable notification', [
                'exam_time_id' => $examTime->id,
                'error' => $e->getMessage(),
            ]);
        }

        // Log exam time creation
        try {
            $subjectName = $examTime->examSubject?->subject?->name ?? 'Unknown';
            $className = $examTime->examClass?->classAcademicYear?->class?->name ?? 'Unknown';
            $examName = $examTime->exam?->name ?? 'Unknown';
            $this->activityLogService->logCreate(
                subject: $examTime,
                description: "Created exam time slot for {$subjectName} in {$className} for exam {$examName}",
                properties: [
                    'exam_time_id' => $examTime->id,
                    'exam_id' => $examTime->exam_id,
                    'exam_class_id' => $examTime->exam_class_id,
                    'exam_subject_id' => $examTime->exam_subject_id,
                    'date' => $examTime->date,
                    'start_time' => $examTime->start_time,
                    'end_time' => $examTime->end_time,
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log exam time creation: '.$e->getMessage());
        }

        $this->examSubjectScheduleService->syncExamSubject($examTime->exam_subject_id);

        return response()->json($examTime, 201);
    }

    /**
     * Update an exam time slot
     */
    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('exams.manage_timetable')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for exams.manage_timetable: '.$e->getMessage());

            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $examTime = ExamTime::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (! $examTime) {
            return response()->json(['error' => 'Exam time not found'], 404);
        }

        // Check if time slot is locked
        if ($examTime->is_locked) {
            return response()->json(['error' => 'This time slot is locked and cannot be modified'], 422);
        }

        // Check if exam is in a modifiable state
        $exam = Exam::find($examTime->exam_id);
        if ($exam && $exam->isConfigurationLocked()) {
            return response()->json([
                'error' => 'Cannot modify timetable for a completed or archived exam',
                'status' => $exam->status,
            ], 422);
        }

        $oldSubjectId = $examTime->exam_subject_id;
        $oldClassId = $examTime->exam_class_id;
        $oldDate = $this->dateKeyFromModel($examTime->date);
        $oldStart = $this->clockFromModel($examTime->start_time);
        $oldEnd = $this->clockFromModel($examTime->end_time);

        // Capture old values before update
        $oldValues = $examTime->only([
            'date', 'start_time', 'end_time', 'room_id', 'invigilator_id', 'notes', 'is_locked',
            'exam_class_id', 'exam_subject_id', 'sort_order',
        ]);

        $this->normalizeClockFields($request);

        $validated = $request->validate([
            'exam_class_id' => 'sometimes|required|uuid|exists:exam_classes,id',
            'exam_subject_id' => 'sometimes|nullable|uuid|exists:exam_subjects,id',
            'class_subject_id' => 'sometimes|nullable|uuid|exists:class_subjects,id',
            'date' => 'sometimes|required|date',
            'start_time' => 'sometimes|required|date_format:H:i',
            'end_time' => 'sometimes|required|date_format:H:i',
            'room_id' => 'nullable|uuid|exists:rooms,id',
            'invigilator_id' => 'nullable|uuid|exists:staff,id',
            'notes' => 'nullable|string|max:1000',
            'is_locked' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer|min:0|max:10000',
            'sync_slot' => 'sometimes|boolean',
        ]);

        $syncSlot = (bool) ($validated['sync_slot'] ?? false);
        unset($validated['sync_slot']);

        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $newClassId = $validated['exam_class_id'] ?? $examTime->exam_class_id;
        $examClass = ExamClass::where('id', $newClassId)
            ->where('exam_id', $exam->id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (! $examClass) {
            return response()->json(['error' => 'Exam class does not belong to this exam'], 422);
        }

        $subjectChanged = array_key_exists('exam_subject_id', $validated)
            || array_key_exists('class_subject_id', $validated);
        if ($subjectChanged || $newClassId !== $oldClassId) {
            $resolved = $this->resolveExamSubject(
                $exam,
                $examClass,
                $profile->organization_id,
                $currentSchoolId,
                $validated['exam_subject_id'] ?? ($subjectChanged ? null : $examTime->exam_subject_id),
                $validated['class_subject_id'] ?? null,
            );

            if ($resolved instanceof \Illuminate\Http\JsonResponse) {
                return $resolved;
            }

            $validated['exam_subject_id'] = $resolved->id;
            $validated['exam_class_id'] = $examClass->id;
        }
        unset($validated['class_subject_id']);

        // Validate date is within exam period
        $newDate = isset($validated['date'])
            ? substr((string) $validated['date'], 0, 10)
            : $oldDate;
        if (! $exam->isDateWithinPeriod($newDate)) {
            return response()->json([
                'error' => 'Date must be within the exam period',
                'exam_start_date' => $exam->start_date?->format('Y-m-d'),
                'exam_end_date' => $exam->end_date?->format('Y-m-d'),
            ], 422);
        }

        $startTime = $this->normalizeClock($validated['start_time'] ?? $oldStart);
        $endTime = $this->normalizeClock($validated['end_time'] ?? $oldEnd);
        $validated['start_time'] = $startTime;
        $validated['end_time'] = $endTime;

        $start = \Carbon\Carbon::createFromFormat('H:i', $startTime);
        $end = \Carbon\Carbon::createFromFormat('H:i', $endTime);
        if ($end->lte($start)) {
            return response()->json(['error' => 'End time must be after start time'], 422);
        }

        $siblingIds = [];
        if ($syncSlot && $newClassId === $oldClassId) {
            $siblingIds = ExamTime::where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->where('exam_id', $exam->id)
                ->where('exam_class_id', $oldClassId)
                ->whereDate('date', $oldDate)
                ->where('start_time', $oldStart)
                ->where('end_time', $oldEnd)
                ->where('id', '!=', $id)
                ->whereNull('deleted_at')
                ->pluck('id')
                ->all();
        }

        $newRoomId = array_key_exists('room_id', $validated) ? $validated['room_id'] : $examTime->room_id;
        if ($newRoomId) {
            $roomConflict = $this->findRoomConflict(
                $profile->organization_id,
                $currentSchoolId,
                $newRoomId,
                $newDate,
                $startTime,
                $endTime,
                $newClassId,
                array_merge([$id], $siblingIds),
            );

            if ($roomConflict) {
                return response()->json([
                    'error' => 'Room is already booked during this time slot',
                    'conflict' => [
                        'date' => $roomConflict->date,
                        'start_time' => $roomConflict->start_time,
                        'end_time' => $roomConflict->end_time,
                    ],
                ], 422);
            }
        }

        $examTime->fill($validated);
        $examTime->save();

        if ($siblingIds !== []) {
            ExamTime::whereIn('id', $siblingIds)
                ->where('is_locked', false)
                ->update([
                    'date' => $newDate,
                    'start_time' => $startTime,
                    'end_time' => $endTime,
                    'room_id' => $newRoomId,
                    'invigilator_id' => array_key_exists('invigilator_id', $validated)
                        ? $validated['invigilator_id']
                        : $examTime->invigilator_id,
                    'notes' => array_key_exists('notes', $validated) ? $validated['notes'] : $examTime->notes,
                ]);
        }

        $examTime->load([
            'examClass.classAcademicYear.class',
            'examSubject.subject',
            'room',
            'invigilator',
            'exam',
        ]);

        // Notify about timetable update
        try {
            $exam = $examTime->exam;
            if ($exam) {
                $this->notificationService->notify(
                    'exam.timetable_updated',
                    $exam,
                    $user,
                    [
                        'title' => '📅 Exam Timetable Updated',
                        'body' => "Timetable for exam '{$exam->name}' has been updated.",
                        'url' => "/exams/{$exam->id}/timetable",
                    ]
                );
            }
        } catch (\Exception $e) {
            Log::warning('Failed to send exam timetable notification', [
                'exam_time_id' => $examTime->id,
                'error' => $e->getMessage(),
            ]);
        }

        // Log exam time update
        try {
            $subjectName = $examTime->examSubject?->subject?->name ?? 'Unknown';
            $className = $examTime->examClass?->classAcademicYear?->class?->name ?? 'Unknown';
            $examName = $examTime->exam?->name ?? 'Unknown';
            $this->activityLogService->logUpdate(
                subject: $examTime,
                description: "Updated exam time slot for {$subjectName} in {$className} for exam {$examName}",
                properties: [
                    'exam_time_id' => $examTime->id,
                    'exam_id' => $examTime->exam_id,
                    'old_values' => $oldValues,
                    'new_values' => $examTime->only([
                        'date', 'start_time', 'end_time', 'room_id', 'invigilator_id', 'notes', 'is_locked',
                    ]),
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log exam time update: '.$e->getMessage());
        }

        $this->examSubjectScheduleService->syncExamSubject($oldSubjectId);
        $this->examSubjectScheduleService->syncExamSubject($examTime->exam_subject_id);

        return response()->json($examTime);
    }

    /**
     * Delete an exam time slot
     */
    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('exams.manage_timetable')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for exams.manage_timetable: '.$e->getMessage());

            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $examTime = ExamTime::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (! $examTime) {
            return response()->json(['error' => 'Exam time not found'], 404);
        }

        // Check if time slot is locked
        if ($examTime->is_locked) {
            return response()->json(['error' => 'This time slot is locked and cannot be deleted'], 422);
        }

        // Check if exam is in a modifiable state
        $exam = Exam::find($examTime->exam_id);
        if ($exam && $exam->isConfigurationLocked()) {
            return response()->json([
                'error' => 'Cannot delete timetable for a completed or archived exam',
                'status' => $exam->status,
            ], 422);
        }

        // Load relationships for logging
        $examTime->load([
            'examClass.classAcademicYear.class',
            'examSubject.subject',
            'exam',
        ]);

        // Log exam time deletion
        try {
            $subjectName = $examTime->examSubject?->subject?->name ?? 'Unknown';
            $className = $examTime->examClass?->classAcademicYear?->class?->name ?? 'Unknown';
            $examName = $examTime->exam?->name ?? 'Unknown';
            $this->activityLogService->logDelete(
                subject: $examTime,
                description: "Deleted exam time slot for {$subjectName} in {$className} for exam {$examName}",
                properties: [
                    'exam_time_id' => $examTime->id,
                    'exam_id' => $examTime->exam_id,
                    'exam_class_id' => $examTime->exam_class_id,
                    'exam_subject_id' => $examTime->exam_subject_id,
                    'date' => $examTime->date,
                    'start_time' => $examTime->start_time,
                    'end_time' => $examTime->end_time,
                    'deleted_entity' => $examTime->toArray(),
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log exam time deletion: '.$e->getMessage());
        }

        $examSubjectId = $examTime->exam_subject_id;

        $examTime->delete();

        $this->examSubjectScheduleService->syncExamSubject($examSubjectId);

        return response()->noContent();
    }

    /**
     * Lock/unlock an exam time slot
     */
    public function toggleLock(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('exams.manage_timetable')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for exams.manage_timetable: '.$e->getMessage());

            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $examTime = ExamTime::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (! $examTime) {
            return response()->json(['error' => 'Exam time not found'], 404);
        }

        $wasLocked = $examTime->is_locked;
        $examTime->is_locked = ! $examTime->is_locked;
        $examTime->save();

        $examTime->load([
            'examClass.classAcademicYear.class',
            'examSubject.subject',
            'room',
            'invigilator',
        ]);

        // Log lock/unlock event
        try {
            $subjectName = $examTime->examSubject?->subject?->name ?? 'Unknown';
            $className = $examTime->examClass?->classAcademicYear?->class?->name ?? 'Unknown';
            $examName = $examTime->exam?->name ?? 'Unknown';
            $action = $examTime->is_locked ? 'locked' : 'unlocked';
            $this->activityLogService->logEvent(
                subject: $examTime,
                event: 'exam_time_lock_toggled',
                description: "{$action} exam time slot for {$subjectName} in {$className} for exam {$examName}",
                properties: [
                    'exam_time_id' => $examTime->id,
                    'exam_id' => $examTime->exam_id,
                    'was_locked' => $wasLocked,
                    'is_locked' => $examTime->is_locked,
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log exam time lock toggle: '.$e->getMessage());
        }

        return response()->json([
            'message' => $examTime->is_locked ? 'Time slot locked' : 'Time slot unlocked',
            'exam_time' => $examTime,
        ]);
    }

    /**
     * Bulk-replace unlocked exam time slots for an exam.
     * Soft-deletes all unlocked times, then inserts the provided set.
     * Locked rows are never modified.
     */
    public function bulkReplace(Request $request, string $examId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('exams.manage_timetable')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for exams.manage_timetable: '.$e->getMessage());

            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        if ($exam->isConfigurationLocked()) {
            return response()->json([
                'error' => 'Cannot modify timetable for a completed or archived exam',
                'status' => $exam->status,
            ], 422);
        }

        $this->normalizeBulkTimes($request);

        $validated = $request->validate([
            'times' => 'present|array',
            'times.*.exam_class_id' => 'required|uuid|exists:exam_classes,id',
            'times.*.exam_subject_id' => 'required|uuid|exists:exam_subjects,id',
            'times.*.date' => 'required|date',
            'times.*.start_time' => 'required|date_format:H:i',
            'times.*.end_time' => 'required|date_format:H:i',
            'times.*.room_id' => 'nullable|uuid|exists:rooms,id',
            'times.*.invigilator_id' => 'nullable|uuid|exists:staff,id',
            'times.*.notes' => 'nullable|string|max:1000',
        ]);

        $times = $validated['times'];

        try {
            $created = DB::transaction(function () use (
                $times,
                $exam,
                $examId,
                $profile,
                $currentSchoolId
            ) {
                $lockedSlots = ExamTime::where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->where('exam_id', $examId)
                    ->where('is_locked', true)
                    ->whereNull('deleted_at')
                    ->get();

                $lockedClassDates = [];
                $lockedRooms = [];
                $lockedSubjectIds = [];
                foreach ($lockedSlots as $locked) {
                    $dateKey = $locked->date instanceof \Carbon\Carbon
                        ? $locked->date->format('Y-m-d')
                        : substr((string) $locked->date, 0, 10);
                    $lockedClassDates[$locked->exam_class_id.'|'.$dateKey] = true;
                    $lockedSubjectIds[$locked->exam_subject_id] = true;
                    if ($locked->room_id) {
                        $start = substr((string) $locked->start_time, 0, 5);
                        $lockedRooms[$locked->room_id.'|'.$dateKey.'|'.$start] = true;
                    }
                }

                // Soft-delete unlocked slots only
                ExamTime::where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->where('exam_id', $examId)
                    ->where('is_locked', false)
                    ->whereNull('deleted_at')
                    ->delete();

                $seenClassDates = [];
                $seenRooms = [];
                $seenSubjects = [];
                $createdRows = [];

                foreach ($times as $index => $row) {
                    $dateKey = substr((string) $row['date'], 0, 10);
                    $startTime = $row['start_time'];
                    $endTime = $row['end_time'];
                    $classDateKey = $row['exam_class_id'].'|'.$dateKey;

                    if (isset($lockedSubjectIds[$row['exam_subject_id']])) {
                        throw new \InvalidArgumentException(
                            "times.{$index}: Cannot schedule a subject that already has a locked time slot"
                        );
                    }

                    if (isset($lockedClassDates[$classDateKey])) {
                        throw new \InvalidArgumentException(
                            "times.{$index}: Conflicts with a locked slot for this class on {$dateKey}"
                        );
                    }

                    if (isset($seenClassDates[$classDateKey])) {
                        throw new \InvalidArgumentException(
                            "times.{$index}: Duplicate paper for the same class on {$dateKey}"
                        );
                    }
                    $seenClassDates[$classDateKey] = true;

                    if (isset($seenSubjects[$row['exam_subject_id']])) {
                        throw new \InvalidArgumentException(
                            "times.{$index}: Subject is scheduled more than once"
                        );
                    }
                    $seenSubjects[$row['exam_subject_id']] = true;

                    $examClass = ExamClass::where('id', $row['exam_class_id'])
                        ->where('exam_id', $examId)
                        ->where('organization_id', $profile->organization_id)
                        ->where('school_id', $currentSchoolId)
                        ->whereNull('deleted_at')
                        ->first();

                    if (! $examClass) {
                        throw new \InvalidArgumentException(
                            "times.{$index}: Exam class does not belong to this exam"
                        );
                    }

                    $examSubject = ExamSubject::where('id', $row['exam_subject_id'])
                        ->where('exam_id', $examId)
                        ->where('exam_class_id', $row['exam_class_id'])
                        ->where('organization_id', $profile->organization_id)
                        ->where('school_id', $currentSchoolId)
                        ->whereNull('deleted_at')
                        ->first();

                    if (! $examSubject) {
                        throw new \InvalidArgumentException(
                            "times.{$index}: Exam subject does not belong to this exam class"
                        );
                    }

                    if (! $exam->isDateWithinPeriod($dateKey)) {
                        throw new \InvalidArgumentException(
                            "times.{$index}: Date must be within the exam period"
                        );
                    }

                    $start = \Carbon\Carbon::createFromFormat('H:i', $startTime);
                    $end = \Carbon\Carbon::createFromFormat('H:i', $endTime);
                    if ($end->lte($start)) {
                        throw new \InvalidArgumentException(
                            "times.{$index}: End time must be after start time"
                        );
                    }

                    $roomId = $row['room_id'] ?? null;
                    if ($roomId) {
                        $roomKey = $roomId.'|'.$dateKey.'|'.$startTime;
                        if (isset($lockedRooms[$roomKey]) || isset($seenRooms[$roomKey])) {
                            throw new \InvalidArgumentException(
                                "times.{$index}: Room is already booked at this date and time"
                            );
                        }

                        $roomConflict = ExamTime::where('organization_id', $profile->organization_id)
                            ->where('school_id', $currentSchoolId)
                            ->where('room_id', $roomId)
                            ->whereDate('date', $dateKey)
                            ->whereNull('deleted_at')
                            ->where(function ($query) use ($startTime, $endTime) {
                                $query->where(function ($q) use ($startTime, $endTime) {
                                    $q->where('start_time', '<', $endTime)
                                        ->where('end_time', '>', $startTime);
                                });
                            })
                            ->exists();

                        if ($roomConflict) {
                            throw new \InvalidArgumentException(
                                "times.{$index}: Room is already booked during this time slot"
                            );
                        }

                        $seenRooms[$roomKey] = true;
                    }

                    $createdRows[] = ExamTime::create([
                        'organization_id' => $profile->organization_id,
                        'school_id' => $currentSchoolId,
                        'exam_id' => $examId,
                        'exam_class_id' => $row['exam_class_id'],
                        'exam_subject_id' => $row['exam_subject_id'],
                        'date' => $dateKey,
                        'start_time' => $startTime,
                        'end_time' => $endTime,
                        'room_id' => $roomId,
                        'invigilator_id' => $row['invigilator_id'] ?? null,
                        'notes' => $row['notes'] ?? null,
                        'is_locked' => false,
                    ]);
                }

                return $createdRows;
            });
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            Log::error('Exam timetable bulk replace failed: '.$e->getMessage());

            return response()->json(['error' => 'Failed to replace exam timetable'], 500);
        }

        // Notify once about timetable update
        try {
            $this->notificationService->notify(
                'exam.timetable_updated',
                $exam,
                $user,
                [
                    'title' => '📅 Exam Timetable Updated',
                    'body' => "Timetable for exam '{$exam->name}' has been updated.",
                    'url' => "/exams/{$exam->id}/timetable",
                ]
            );
        } catch (\Exception $e) {
            Log::warning('Failed to send exam timetable notification', [
                'exam_id' => $examId,
                'error' => $e->getMessage(),
            ]);
        }

        try {
            $this->activityLogService->logEvent(
                subject: $exam,
                event: 'exam_timetable_bulk_replaced',
                description: "Bulk replaced exam timetable for {$exam->name} (".count($created).' slots)',
                properties: [
                    'exam_id' => $examId,
                    'created_count' => count($created),
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log exam timetable bulk replace: '.$e->getMessage());
        }

        $this->examSubjectScheduleService->syncExam(
            $examId,
            $profile->organization_id,
            $currentSchoolId
        );

        $examTimes = ExamTime::with([
            'examClass.classAcademicYear.class',
            'examSubject.subject',
            'room',
            'invigilator',
        ])
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('exam_id', $examId)
            ->whereNull('deleted_at')
            ->orderBy('date', 'asc')
            ->orderBy('start_time', 'asc')
            ->orderBy('sort_order', 'asc')
            ->get();

        return response()->json([
            'data' => $examTimes,
            'created_count' => count($created),
        ]);
    }

    public function reorder(Request $request, string $examId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('exams.manage_timetable')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for exams.manage_timetable: '.$e->getMessage());

            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (! $exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        if ($exam->isConfigurationLocked()) {
            return response()->json([
                'error' => 'Cannot modify timetable for a completed or archived exam',
                'status' => $exam->status,
            ], 422);
        }

        $validated = $request->validate([
            'exam_time_ids' => 'required|array|min:1',
            'exam_time_ids.*' => 'required|uuid',
        ]);

        $ids = array_values(array_unique($validated['exam_time_ids']));
        $rows = ExamTime::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('exam_id', $examId)
            ->whereIn('id', $ids)
            ->whereNull('deleted_at')
            ->get();

        if ($rows->count() !== count($ids)) {
            return response()->json(['error' => 'One or more time slots were not found'], 422);
        }

        if ($rows->contains(fn (ExamTime $row) => (bool) $row->is_locked)) {
            return response()->json(['error' => 'A locked time slot cannot be reordered'], 422);
        }

        $slot = $this->slotSignature($rows->first());
        foreach ($rows as $row) {
            if ($this->slotSignature($row) !== $slot) {
                return response()->json(['error' => 'Subjects can only be reordered within the same slot'], 422);
            }
        }

        foreach ($ids as $index => $timeId) {
            ExamTime::where('id', $timeId)->update(['sort_order' => $index]);
        }

        $examTimes = ExamTime::with([
            'examClass.classAcademicYear.class',
            'examSubject.subject',
            'room',
            'invigilator',
        ])
            ->whereIn('id', $ids)
            ->orderBy('sort_order', 'asc')
            ->get();

        return response()->json(['data' => $examTimes]);
    }

    private function normalizeClock(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return $value;
        }

        if (preg_match('/^(\d{2}:\d{2})/', $value, $matches)) {
            return $matches[1];
        }

        return $value;
    }

    private function normalizeClockFields(Request $request): void
    {
        $merge = [];
        foreach (['start_time', 'end_time'] as $field) {
            if ($request->exists($field) && is_string($request->input($field))) {
                $merge[$field] = $this->normalizeClock($request->input($field));
            }
        }

        if ($merge !== []) {
            $request->merge($merge);
        }
    }

    private function normalizeBulkTimes(Request $request): void
    {
        $times = $request->input('times');
        if (! is_array($times)) {
            return;
        }

        foreach ($times as $index => $row) {
            if (! is_array($row)) {
                continue;
            }
            foreach (['start_time', 'end_time'] as $field) {
                if (isset($row[$field]) && is_string($row[$field])) {
                    $times[$index][$field] = $this->normalizeClock($row[$field]);
                }
            }
        }

        $request->merge(['times' => $times]);
    }

    private function clockFromModel(mixed $value): string
    {
        if ($value instanceof \Carbon\CarbonInterface) {
            return $value->format('H:i');
        }

        return $this->normalizeClock((string) $value) ?? '';
    }

    private function dateKeyFromModel(mixed $value): string
    {
        if ($value instanceof \Carbon\CarbonInterface) {
            return $value->format('Y-m-d');
        }

        return substr((string) $value, 0, 10);
    }

    private function slotSignature(ExamTime $examTime): string
    {
        return implode('|', [
            $examTime->exam_class_id,
            $this->dateKeyFromModel($examTime->date),
            $this->clockFromModel($examTime->start_time),
            $this->clockFromModel($examTime->end_time),
        ]);
    }

    /**
     * @param  array<int, string>  $ignoreIds
     */
    private function findRoomConflict(
        string $organizationId,
        string $schoolId,
        string $roomId,
        string $date,
        string $startTime,
        string $endTime,
        string $examClassId,
        array $ignoreIds = [],
    ): ?ExamTime {
        return ExamTime::where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->where('room_id', $roomId)
            ->whereDate('date', $date)
            ->whereNull('deleted_at')
            ->when($ignoreIds !== [], fn ($query) => $query->whereNotIn('id', $ignoreIds))
            ->where('start_time', '<', $endTime)
            ->where('end_time', '>', $startTime)
            ->where(function ($query) use ($examClassId, $startTime, $endTime) {
                $query->where('exam_class_id', '!=', $examClassId)
                    ->orWhere(function ($sameClass) use ($startTime, $endTime) {
                        $sameClass->where('start_time', '!=', $startTime)
                            ->orWhere('end_time', '!=', $endTime);
                    });
            })
            ->first();
    }

    private function nextSortOrder(
        string $organizationId,
        string $schoolId,
        string $examClassId,
        string $date,
        string $startTime,
        string $endTime,
    ): int {
        $max = ExamTime::where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->where('exam_class_id', $examClassId)
            ->whereDate('date', $date)
            ->where('start_time', $startTime)
            ->where('end_time', $endTime)
            ->whereNull('deleted_at')
            ->max('sort_order');

        return $max === null ? 0 : ((int) $max) + 1;
    }

    /**
     * @return ExamSubject|\Illuminate\Http\JsonResponse
     */
    private function resolveExamSubject(
        Exam $exam,
        ExamClass $examClass,
        string $organizationId,
        string $schoolId,
        ?string $examSubjectId,
        ?string $classSubjectId,
    ) {
        if ($examSubjectId) {
            $examSubject = ExamSubject::where('id', $examSubjectId)
                ->where('exam_id', $exam->id)
                ->where('exam_class_id', $examClass->id)
                ->where('organization_id', $organizationId)
                ->where('school_id', $schoolId)
                ->whereNull('deleted_at')
                ->first();

            if (! $examSubject) {
                return response()->json(['error' => 'Exam subject does not belong to this exam class'], 422);
            }

            return $examSubject;
        }

        if (! $classSubjectId) {
            return response()->json(['error' => 'A class subject is required'], 422);
        }

        $classSubject = ClassSubject::where('id', $classSubjectId)
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->where('class_academic_year_id', $examClass->class_academic_year_id)
            ->whereNull('deleted_at')
            ->first();

        if (! $classSubject) {
            return response()->json(['error' => 'Subject must belong to the selected exam class'], 422);
        }

        $existing = ExamSubject::where('exam_id', $exam->id)
            ->where('exam_class_id', $examClass->id)
            ->where('class_subject_id', $classSubject->id)
            ->whereNull('deleted_at')
            ->first();

        if ($existing) {
            return $existing;
        }

        return ExamSubject::create([
            'exam_id' => $exam->id,
            'exam_class_id' => $examClass->id,
            'class_subject_id' => $classSubject->id,
            'subject_id' => $classSubject->subject_id,
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
        ]);
    }
}
