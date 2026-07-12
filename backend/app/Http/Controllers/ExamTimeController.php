<?php

namespace App\Http\Controllers;

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

        $validated = $request->validate([
            'exam_class_id' => 'required|uuid|exists:exam_classes,id',
            'exam_subject_id' => 'required|uuid|exists:exam_subjects,id',
            'date' => 'required|date',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'room_id' => 'nullable|uuid|exists:rooms,id',
            'invigilator_id' => 'nullable|uuid|exists:staff,id',
            'notes' => 'nullable|string|max:1000',
        ]);

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

        // Verify exam_subject belongs to this exam_class
        $examSubject = ExamSubject::where('id', $validated['exam_subject_id'])
            ->where('exam_id', $examId)
            ->where('exam_class_id', $validated['exam_class_id'])
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (! $examSubject) {
            return response()->json(['error' => 'Exam subject does not belong to this exam class'], 422);
        }

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

        // Check for room conflicts if room is specified
        if (! empty($validated['room_id'])) {
            $roomConflict = ExamTime::where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->where('room_id', $validated['room_id'])
                ->whereDate('date', $validated['date'])
                ->whereNull('deleted_at')
                ->where(function ($query) use ($validated) {
                    $query->where(function ($q) use ($validated) {
                        $q->where('start_time', '<', $validated['end_time'])
                            ->where('end_time', '>', $validated['start_time']);
                    });
                })
                ->first();

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

        // Capture old values before update
        $oldValues = $examTime->only([
            'date', 'start_time', 'end_time', 'room_id', 'invigilator_id', 'notes', 'is_locked',
        ]);

        $validated = $request->validate([
            'date' => 'sometimes|required|date',
            'start_time' => 'sometimes|required|date_format:H:i',
            'end_time' => 'sometimes|required|date_format:H:i',
            'room_id' => 'nullable|uuid|exists:rooms,id',
            'invigilator_id' => 'nullable|uuid|exists:staff,id',
            'notes' => 'nullable|string|max:1000',
            'is_locked' => 'sometimes|boolean',
        ]);

        // Validate date is within exam period
        $newDate = $validated['date'] ?? $examTime->date;
        if ($exam && ! $exam->isDateWithinPeriod($newDate)) {
            return response()->json([
                'error' => 'Date must be within the exam period',
                'exam_start_date' => $exam->start_date?->format('Y-m-d'),
                'exam_end_date' => $exam->end_date?->format('Y-m-d'),
            ], 422);
        }

        // Validate time consistency
        $startTime = $validated['start_time'] ?? $examTime->start_time;
        $endTime = $validated['end_time'] ?? $examTime->end_time;

        $start = \Carbon\Carbon::createFromFormat('H:i', $startTime);
        $end = \Carbon\Carbon::createFromFormat('H:i', $endTime);
        if ($end->lte($start)) {
            return response()->json(['error' => 'End time must be after start time'], 422);
        }

        // Check for room conflicts if room is being set/changed
        $newRoomId = array_key_exists('room_id', $validated) ? $validated['room_id'] : $examTime->room_id;
        if ($newRoomId) {
            $roomConflict = ExamTime::where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->where('room_id', $newRoomId)
                ->whereDate('date', $newDate)
                ->where('id', '!=', $id)
                ->whereNull('deleted_at')
                ->where(function ($query) use ($startTime, $endTime) {
                    $query->where(function ($q) use ($startTime, $endTime) {
                        $q->where('start_time', '<', $endTime)
                            ->where('end_time', '>', $startTime);
                    });
                })
                ->first();

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
            ->get();

        return response()->json([
            'data' => $examTimes,
            'created_count' => count($created),
        ]);
    }
}
