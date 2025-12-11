<?php

namespace App\Http\Controllers;

use App\Models\Exam;
use App\Models\ExamClass;
use App\Models\ExamSubject;
use App\Models\ExamTime;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ExamTimeController extends Controller
{
    /**
     * Get all exam times for an exam
     */
    public function index(Request $request, string $examId)
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

        // Verify exam exists and belongs to organization
        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $query = ExamTime::with([
                'examClass.classAcademicYear.class',
                'examSubject.subject',
                'room',
                'invigilator'
            ])
            ->where('organization_id', $profile->organization_id)
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

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exams.manage_timetable')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.manage_timetable: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Verify exam exists and belongs to organization
        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        // Check if exam can be modified
        if ($exam->isConfigurationLocked()) {
            return response()->json([
                'error' => 'Cannot add timetable to a completed or archived exam',
                'status' => $exam->status
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
            ->whereNull('deleted_at')
            ->first();

        if (!$examClass) {
            return response()->json(['error' => 'Exam class does not belong to this exam'], 422);
        }

        // Verify exam_subject belongs to this exam_class
        $examSubject = ExamSubject::where('id', $validated['exam_subject_id'])
            ->where('exam_id', $examId)
            ->where('exam_class_id', $validated['exam_class_id'])
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$examSubject) {
            return response()->json(['error' => 'Exam subject does not belong to this exam class'], 422);
        }

        // Validate date is within exam period
        if (!$exam->isDateWithinPeriod($validated['date'])) {
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
        if (!empty($validated['room_id'])) {
            $roomConflict = ExamTime::where('organization_id', $profile->organization_id)
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
                    ]
                ], 422);
            }
        }

        // Check for duplicate subject scheduling on same date/time
        $duplicateSubject = ExamTime::where('organization_id', $profile->organization_id)
            ->where('exam_subject_id', $validated['exam_subject_id'])
            ->whereDate('date', $validated['date'])
            ->where('start_time', $validated['start_time'])
            ->whereNull('deleted_at')
            ->exists();

        if ($duplicateSubject) {
            return response()->json([
                'error' => 'This subject is already scheduled at this date and time'
            ], 422);
        }

        $examTime = ExamTime::create([
            'organization_id' => $profile->organization_id,
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
            'invigilator'
        ]);

        return response()->json($examTime, 201);
    }

    /**
     * Update an exam time slot
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
            if (!$user->hasPermissionTo('exams.manage_timetable')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.manage_timetable: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $examTime = ExamTime::where('organization_id', $profile->organization_id)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$examTime) {
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
                'status' => $exam->status
            ], 422);
        }

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
        if ($exam && !$exam->isDateWithinPeriod($newDate)) {
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
                    ]
                ], 422);
            }
        }

        $examTime->fill($validated);
        $examTime->save();

        $examTime->load([
            'examClass.classAcademicYear.class',
            'examSubject.subject',
            'room',
            'invigilator'
        ]);

        return response()->json($examTime);
    }

    /**
     * Delete an exam time slot
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
            if (!$user->hasPermissionTo('exams.manage_timetable')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.manage_timetable: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $examTime = ExamTime::where('organization_id', $profile->organization_id)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$examTime) {
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
                'status' => $exam->status
            ], 422);
        }

        $examTime->delete();

        return response()->noContent();
    }

    /**
     * Lock/unlock an exam time slot
     */
    public function toggleLock(Request $request, string $id)
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
            if (!$user->hasPermissionTo('exams.manage_timetable')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.manage_timetable: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $examTime = ExamTime::where('organization_id', $profile->organization_id)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$examTime) {
            return response()->json(['error' => 'Exam time not found'], 404);
        }

        $examTime->is_locked = !$examTime->is_locked;
        $examTime->save();

        $examTime->load([
            'examClass.classAcademicYear.class',
            'examSubject.subject',
            'room',
            'invigilator'
        ]);

        return response()->json([
            'message' => $examTime->is_locked ? 'Time slot locked' : 'Time slot unlocked',
            'exam_time' => $examTime
        ]);
    }
}
