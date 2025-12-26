<?php

namespace App\Http\Controllers;

use App\Models\Exam;
use App\Models\ExamAttendance;
use App\Models\ExamTime;
use App\Models\ExamClass;
use App\Models\ExamSubject;
use App\Models\ExamStudent;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ExamAttendanceController extends Controller
{
    /**
     * Get all attendance records for an exam
     * GET /api/exams/{exam}/attendance
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

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('exams.view_attendance_reports')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.view_attendance_reports: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Verify exam belongs to organization
        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $query = ExamAttendance::with([
            'examTime',
            'examClass.classAcademicYear.class',
            'examSubject.subject',
            'student'
        ])
            ->whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('exam_id', $examId);

        // Optional filters
        if ($request->filled('exam_class_id')) {
            $query->where('exam_class_id', $request->exam_class_id);
        }

        if ($request->filled('exam_time_id')) {
            $query->where('exam_time_id', $request->exam_time_id);
        }

        if ($request->filled('exam_subject_id')) {
            $query->where('exam_subject_id', $request->exam_subject_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('date')) {
            $query->whereHas('examTime', function ($q) use ($request) {
                $q->whereDate('date', $request->date);
            });
        }

        $attendances = $query->orderBy('created_at', 'desc')->get();

        return response()->json($attendances);
    }

    /**
     * Get attendance for a specific class in an exam
     * GET /api/exams/{exam}/attendance/class/{classId}
     */
    public function byClass(Request $request, string $examId, string $classId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('exams.view_attendance_reports')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.view_attendance_reports: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Verify exam belongs to organization
        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        // Verify class belongs to exam
        $examClass = ExamClass::where('id', $classId)
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$examClass) {
            return response()->json(['error' => 'Exam class not found'], 404);
        }

        $attendances = ExamAttendance::with([
            'examTime',
            'examSubject.subject',
            'student'
        ])
            ->whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('exam_id', $examId)
            ->where('exam_class_id', $classId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($attendances);
    }

    /**
     * Get attendance for a specific timeslot
     * GET /api/exams/{exam}/attendance/timeslot/{examTimeId}
     */
    public function byTimeslot(Request $request, string $examId, string $examTimeId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('exams.view_attendance_reports')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.view_attendance_reports: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Verify exam time slot belongs to exam and organization
        $examTime = ExamTime::where('id', $examTimeId)
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$examTime) {
            return response()->json(['error' => 'Exam time slot not found'], 404);
        }

        $attendances = ExamAttendance::with(['student'])
            ->whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('exam_time_id', $examTimeId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($attendances);
    }

    /**
     * Get students eligible for attendance marking for a timeslot
     * Returns enrolled students with their attendance status if any
     * GET /api/exams/{exam}/attendance/timeslot/{examTimeId}/students
     */
    public function getTimeslotStudents(Request $request, string $examId, string $examTimeId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('exams.manage_attendance') && !$user->hasPermissionTo('exams.view_attendance_reports')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.manage_attendance: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Verify exam time slot
        $examTime = ExamTime::with(['examClass', 'examSubject'])
            ->where('id', $examTimeId)
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$examTime) {
            return response()->json(['error' => 'Exam time slot not found'], 404);
        }

        // Get enrolled students for this class (include roll numbers for fast lookup)
        $examStudents = ExamStudent::with(['studentAdmission.student'])
            ->where('exam_id', $examId)
            ->where('exam_class_id', $examTime->exam_class_id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->get();

        // Get existing attendance records for this timeslot
        $existingAttendance = ExamAttendance::where('exam_time_id', $examTimeId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->get()
            ->keyBy('student_id');

        // Build the response with attendance status
        $students = $examStudents->map(function ($examStudent) use ($existingAttendance) {
            $student = $examStudent->studentAdmission->student ?? null;
            if (!$student) return null;

            $attendance = $existingAttendance->get($student->id);

            return [
                'exam_student_id' => $examStudent->id,
                'student_id' => $student->id,
                'student' => [
                    'id' => $student->id,
                    'full_name' => $student->full_name,
                    'father_name' => $student->father_name,
                    'admission_no' => $student->admission_no,
                    'student_code' => $student->student_code,
                    'card_number' => $student->card_number,
                ],
                'roll_number' => $examStudent->exam_roll_number,
                'attendance' => $attendance ? [
                    'id' => $attendance->id,
                    'status' => $attendance->status,
                    'checked_in_at' => $attendance->checked_in_at,
                    'seat_number' => $attendance->seat_number,
                    'notes' => $attendance->notes,
                ] : null,
            ];
        })->filter()->values();

        return response()->json([
            'exam_time' => [
                'id' => $examTime->id,
                'date' => $examTime->date,
                'start_time' => $examTime->start_time,
                'end_time' => $examTime->end_time,
                'exam_class_id' => $examTime->exam_class_id,
                'exam_subject_id' => $examTime->exam_subject_id,
            ],
            'students' => $students,
            'counts' => [
                'total' => $students->count(),
                'marked' => $existingAttendance->count(),
                'present' => $existingAttendance->where('status', 'present')->count(),
                'absent' => $existingAttendance->where('status', 'absent')->count(),
                'late' => $existingAttendance->where('status', 'late')->count(),
                'excused' => $existingAttendance->where('status', 'excused')->count(),
            ],
        ]);
    }

    /**
     * Bulk mark attendance for a timeslot
     * POST /api/exams/{exam}/attendance/mark
     */
    public function mark(Request $request, string $examId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('exams.manage_attendance')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.manage_attendance: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'exam_time_id' => 'required|uuid|exists:exam_times,id',
            'attendances' => 'required|array|min:1',
            'attendances.*.student_id' => 'required|uuid|exists:students,id',
            'attendances.*.status' => 'required|in:present,absent,late,excused',
            'attendances.*.checked_in_at' => 'nullable|date',
            'attendances.*.seat_number' => 'nullable|string|max:50',
            'attendances.*.notes' => 'nullable|string|max:1000',
        ]);

        // Verify exam belongs to organization
        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        // Check if attendance can be marked
        if (!$exam->canMarkAttendance()) {
            return response()->json([
                'error' => 'Cannot mark attendance for exam in this status',
                'status' => $exam->status,
                'allowed_statuses' => [Exam::STATUS_SCHEDULED, Exam::STATUS_IN_PROGRESS],
            ], 422);
        }

        // Verify exam time slot
        $examTime = ExamTime::with(['examClass', 'examSubject'])
            ->where('id', $validated['exam_time_id'])
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$examTime) {
            return response()->json(['error' => 'Exam time slot not found or does not belong to this exam'], 404);
        }

        // Get enrolled students for this class
        $enrolledStudentIds = ExamStudent::where('exam_id', $examId)
            ->where('exam_class_id', $examTime->exam_class_id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->with('studentAdmission')
            ->get()
            ->pluck('studentAdmission.student_id')
            ->filter()
            ->toArray();

        $created = 0;
        $updated = 0;
        $errors = [];

        DB::beginTransaction();
        try {
            foreach ($validated['attendances'] as $attendanceData) {
                // Verify student is enrolled
                if (!in_array($attendanceData['student_id'], $enrolledStudentIds)) {
                    $errors[] = [
                        'student_id' => $attendanceData['student_id'],
                        'error' => 'Student is not enrolled in this exam class',
                    ];
                    continue;
                }

                // Check for existing attendance record
                $existing = ExamAttendance::where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->where('exam_time_id', $examTime->id)
                    ->where('student_id', $attendanceData['student_id'])
                    ->whereNull('deleted_at')
                    ->first();

                if ($existing) {
                    // Update existing record
                    $existing->update([
                        'status' => $attendanceData['status'],
                        'checked_in_at' => $attendanceData['checked_in_at'] ?? now(),
                        'seat_number' => $attendanceData['seat_number'] ?? $existing->seat_number,
                        'notes' => $attendanceData['notes'] ?? $existing->notes,
                    ]);
                    $updated++;
                } else {
                    // Create new record
                    ExamAttendance::create([
                        'organization_id' => $profile->organization_id,
                        'school_id' => $currentSchoolId,
                        'exam_id' => $examId,
                        'exam_time_id' => $examTime->id,
                        'exam_class_id' => $examTime->exam_class_id,
                        'exam_subject_id' => $examTime->exam_subject_id,
                        'student_id' => $attendanceData['student_id'],
                        'status' => $attendanceData['status'],
                        'checked_in_at' => $attendanceData['checked_in_at'] ?? now(),
                        'seat_number' => $attendanceData['seat_number'] ?? null,
                        'notes' => $attendanceData['notes'] ?? null,
                    ]);
                    $created++;
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Attendance marked successfully',
                'created' => $created,
                'updated' => $updated,
                'errors' => $errors,
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error marking attendance: " . $e->getMessage());
            return response()->json(['error' => 'Failed to mark attendance', 'details' => $e->getMessage()], 500);
        }
    }

    /**
     * Update a single attendance record
     * PUT /api/exam-attendance/{id}
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

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('exams.manage_attendance')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.manage_attendance: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $attendance = ExamAttendance::with('exam')
            ->where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$attendance) {
            return response()->json(['error' => 'Attendance record not found'], 404);
        }

        // Strict school scoping via parent exam
        if ($attendance->exam?->school_id !== $currentSchoolId) {
            return response()->json(['error' => 'Attendance record not found'], 404);
        }

        // Check if exam allows attendance modification
        if (!$attendance->exam->canMarkAttendance()) {
            return response()->json([
                'error' => 'Cannot modify attendance for exam in this status',
                'status' => $attendance->exam->status,
            ], 422);
        }

        $validated = $request->validate([
            'status' => 'sometimes|required|in:present,absent,late,excused',
            'checked_in_at' => 'nullable|date',
            'seat_number' => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:1000',
        ]);

        $attendance->update($validated);

        return response()->json($attendance->fresh(['examTime', 'student']));
    }

    /**
     * Delete (soft delete) an attendance record
     * DELETE /api/exam-attendance/{id}
     */
    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('exams.manage_attendance')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.manage_attendance: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $attendance = ExamAttendance::with('exam')
            ->where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$attendance) {
            return response()->json(['error' => 'Attendance record not found'], 404);
        }

        // Strict school scoping via parent exam
        if ($attendance->exam?->school_id !== $currentSchoolId) {
            return response()->json(['error' => 'Attendance record not found'], 404);
        }

        // Check if exam allows attendance modification
        if (!$attendance->exam->canMarkAttendance()) {
            return response()->json([
                'error' => 'Cannot delete attendance for exam in this status',
                'status' => $attendance->exam->status,
            ], 422);
        }

        // Soft delete
        $attendance->delete();

        return response()->noContent();
    }

    /**
     * Get attendance summary for an exam
     * GET /api/exams/{exam}/attendance/summary
     */
    public function summary(Request $request, string $examId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('exams.view_attendance_reports')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.view_attendance_reports: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Verify exam
        $exam = Exam::with(['examClasses.classAcademicYear.class', 'examSubjects.subject'])
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        // Get total enrolled students
        $totalEnrolled = ExamStudent::where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->count();

        // Get attendance summary
        $attendanceCounts = ExamAttendance::where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        // Get total attendance records
        $totalAttendanceRecords = array_sum($attendanceCounts);

        // Get breakdown by class
        $classSummary = ExamAttendance::where('exam_attendances.exam_id', $examId)
            ->where('exam_attendances.organization_id', $profile->organization_id)
            ->where('exam_attendances.school_id', $currentSchoolId)
            ->whereNull('exam_attendances.deleted_at')
            ->join('exam_classes', 'exam_attendances.exam_class_id', '=', 'exam_classes.id')
            ->join('class_academic_years', 'exam_classes.class_academic_year_id', '=', 'class_academic_years.id')
            ->join('classes', 'class_academic_years.class_id', '=', 'classes.id')
            ->select(
                'exam_attendances.exam_class_id',
                'classes.name as class_name',
                'class_academic_years.section_name',
                'exam_attendances.status',
                DB::raw('count(*) as count')
            )
            ->groupBy('exam_attendances.exam_class_id', 'classes.name', 'class_academic_years.section_name', 'exam_attendances.status')
            ->get();

        // Group by class
        $byClass = [];
        foreach ($classSummary as $row) {
            $classKey = $row->exam_class_id;
            if (!isset($byClass[$classKey])) {
                $byClass[$classKey] = [
                    'exam_class_id' => $row->exam_class_id,
                    'class_name' => $row->class_name,
                    'section_name' => $row->section_name,
                    'present' => 0,
                    'absent' => 0,
                    'late' => 0,
                    'excused' => 0,
                ];
            }
            $byClass[$classKey][$row->status] = $row->count;
        }

        // Get breakdown by subject
        $subjectSummary = ExamAttendance::where('exam_attendances.exam_id', $examId)
            ->where('exam_attendances.organization_id', $profile->organization_id)
            ->where('exam_attendances.school_id', $currentSchoolId)
            ->whereNull('exam_attendances.deleted_at')
            ->join('exam_subjects', 'exam_attendances.exam_subject_id', '=', 'exam_subjects.id')
            ->join('subjects', 'exam_subjects.subject_id', '=', 'subjects.id')
            ->select(
                'exam_attendances.exam_subject_id',
                'subjects.name as subject_name',
                'exam_attendances.status',
                DB::raw('count(*) as count')
            )
            ->groupBy('exam_attendances.exam_subject_id', 'subjects.name', 'exam_attendances.status')
            ->get();

        // Group by subject
        $bySubject = [];
        foreach ($subjectSummary as $row) {
            $subjectKey = $row->exam_subject_id;
            if (!isset($bySubject[$subjectKey])) {
                $bySubject[$subjectKey] = [
                    'exam_subject_id' => $row->exam_subject_id,
                    'subject_name' => $row->subject_name,
                    'present' => 0,
                    'absent' => 0,
                    'late' => 0,
                    'excused' => 0,
                ];
            }
            $bySubject[$subjectKey][$row->status] = $row->count;
        }

        return response()->json([
            'exam' => [
                'id' => $exam->id,
                'name' => $exam->name,
                'status' => $exam->status,
            ],
            'totals' => [
                'enrolled_students' => $totalEnrolled,
                'attendance_records' => $totalAttendanceRecords,
                'present' => $attendanceCounts['present'] ?? 0,
                'absent' => $attendanceCounts['absent'] ?? 0,
                'late' => $attendanceCounts['late'] ?? 0,
                'excused' => $attendanceCounts['excused'] ?? 0,
            ],
            'by_class' => array_values($byClass),
            'by_subject' => array_values($bySubject),
        ]);
    }

    /**
     * Get attendance report for a specific student in an exam
     * GET /api/exams/{exam}/attendance/students/{studentId}
     */
    public function studentReport(Request $request, string $examId, string $studentId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('exams.view_attendance_reports')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.view_attendance_reports: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Verify exam
        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        // Verify student
        $student = Student::where('id', $studentId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->first();

        if (!$student) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        // Get all attendance records for this student in this exam
        $attendances = ExamAttendance::with([
            'examTime',
            'examSubject.subject',
            'examClass.classAcademicYear.class'
        ])
            ->where('exam_id', $examId)
            ->where('student_id', $studentId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->orderBy('created_at', 'asc')
            ->get();

        // Calculate summary
        $statusCounts = $attendances->groupBy('status')->map->count();

        return response()->json([
            'exam' => [
                'id' => $exam->id,
                'name' => $exam->name,
            ],
            'student' => [
                'id' => $student->id,
                'full_name' => $student->full_name,
                'admission_no' => $student->admission_no,
            ],
            'attendances' => $attendances->map(function ($att) {
                return [
                    'id' => $att->id,
                    'exam_time' => [
                        'id' => $att->examTime->id,
                        'date' => $att->examTime->date,
                        'start_time' => $att->examTime->start_time,
                        'end_time' => $att->examTime->end_time,
                    ],
                    'subject' => [
                        'id' => $att->examSubject->subject->id ?? null,
                        'name' => $att->examSubject->subject->name ?? 'Unknown',
                    ],
                    'class' => [
                        'name' => $att->examClass->classAcademicYear->class->name ?? 'Unknown',
                        'section' => $att->examClass->classAcademicYear->section_name ?? null,
                    ],
                    'status' => $att->status,
                    'checked_in_at' => $att->checked_in_at,
                    'seat_number' => $att->seat_number,
                    'notes' => $att->notes,
                ];
            }),
            'summary' => [
                'total_sessions' => $attendances->count(),
                'present' => $statusCounts->get('present', 0),
                'absent' => $statusCounts->get('absent', 0),
                'late' => $statusCounts->get('late', 0),
                'excused' => $statusCounts->get('excused', 0),
            ],
        ]);
    }

    /**
     * Get attendance summary for a specific timeslot
     * GET /api/exams/{exam}/attendance/timeslots/{examTimeId}/summary
     */
    public function timeslotSummary(Request $request, string $examId, string $examTimeId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('exams.view_attendance_reports')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.view_attendance_reports: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Verify exam time
        $examTime = ExamTime::with(['examClass.classAcademicYear.class', 'examSubject.subject', 'room', 'invigilator'])
            ->where('id', $examTimeId)
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$examTime) {
            return response()->json(['error' => 'Exam time slot not found'], 404);
        }

        // Get enrolled student count for this class
        $enrolledCount = ExamStudent::where('exam_id', $examId)
            ->where('exam_class_id', $examTime->exam_class_id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->count();

        // Get attendance counts
        $attendanceCounts = ExamAttendance::where('exam_time_id', $examTimeId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $markedCount = array_sum($attendanceCounts);

        return response()->json([
            'exam_time' => [
                'id' => $examTime->id,
                'date' => $examTime->date,
                'start_time' => $examTime->start_time,
                'end_time' => $examTime->end_time,
                'room' => $examTime->room ? [
                    'id' => $examTime->room->id,
                    'name' => $examTime->room->name,
                ] : null,
                'invigilator' => $examTime->invigilator ? [
                    'id' => $examTime->invigilator->id,
                    'name' => $examTime->invigilator->first_name . ' ' . $examTime->invigilator->last_name,
                ] : null,
            ],
            'class' => [
                'id' => $examTime->examClass->id,
                'name' => $examTime->examClass->classAcademicYear->class->name ?? 'Unknown',
                'section' => $examTime->examClass->classAcademicYear->section_name ?? null,
            ],
            'subject' => [
                'id' => $examTime->examSubject->id,
                'name' => $examTime->examSubject->subject->name ?? 'Unknown',
            ],
            'counts' => [
                'enrolled' => $enrolledCount,
                'marked' => $markedCount,
                'unmarked' => $enrolledCount - $markedCount,
                'present' => $attendanceCounts['present'] ?? 0,
                'absent' => $attendanceCounts['absent'] ?? 0,
                'late' => $attendanceCounts['late'] ?? 0,
                'excused' => $attendanceCounts['excused'] ?? 0,
            ],
            'percentage' => [
                'marked' => $enrolledCount > 0 ? round(($markedCount / $enrolledCount) * 100, 1) : 0,
                'present' => $markedCount > 0 ? round((($attendanceCounts['present'] ?? 0) / $markedCount) * 100, 1) : 0,
            ],
        ]);
    }

    /**
     * Scan card for attendance (barcode scanning)
     * POST /api/exams/{exam}/attendance/scan
     */
    public function scan(Request $request, string $examId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('exams.manage_attendance')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.manage_attendance: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'exam_time_id' => 'required|uuid|exists:exam_times,id',
            'roll_number' => 'required|string',
            'status' => 'nullable|in:present,absent,late,excused',
            'notes' => 'nullable|string|max:1000',
        ]);

        // Verify exam belongs to organization
        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        // Check if attendance can be marked
        if (!$exam->canMarkAttendance()) {
            return response()->json([
                'error' => 'Cannot mark attendance for exam in this status',
                'status' => $exam->status,
                'allowed_statuses' => [Exam::STATUS_SCHEDULED, Exam::STATUS_IN_PROGRESS],
            ], 422);
        }

        // Verify exam time slot
        $examTime = ExamTime::with(['examClass', 'examSubject'])
            ->where('id', $validated['exam_time_id'])
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$examTime) {
            return response()->json(['error' => 'Exam time slot not found or does not belong to this exam'], 404);
        }

        // Find student by exam_roll_number (primary method for exam attendance)
        $rollNumber = trim($validated['roll_number']);

        // First, find the exam student by roll number
        $examStudent = ExamStudent::with(['studentAdmission.student'])
            ->where('exam_id', $examId)
            ->where('exam_class_id', $examTime->exam_class_id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('exam_roll_number', $rollNumber)
            ->whereNull('deleted_at')
            ->first();

        if (!$examStudent) {
            // Fallback: try to find by student code or admission number if roll number not found
            $searchTerm = $rollNumber;
            $student = Student::where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->where(function ($q) use ($searchTerm) {
                    $q->where('student_code', $searchTerm)
                        ->orWhere('admission_no', $searchTerm)
                        ->orWhere('card_number', $searchTerm);
                })
                ->whereNull('deleted_at')
                ->first();

            if (!$student) {
                return response()->json(['error' => 'Student not found'], 404);
            }

            // Find exam student by student ID
            $examStudent = ExamStudent::with(['studentAdmission.student'])
                ->where('exam_id', $examId)
                ->where('exam_class_id', $examTime->exam_class_id)
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereHas('studentAdmission', function ($query) use ($student) {
                    $query->where('student_id', $student->id);
                })
                ->whereNull('deleted_at')
                ->first();

            if (!$examStudent) {
                return response()->json(['error' => 'Student is not enrolled in this exam class'], 422);
            }
        }

        $student = $examStudent->studentAdmission?->student;
        if (!$student) {
            return response()->json(['error' => 'Student data not found'], 404);
        }

        // Create or update attendance record
        $status = $validated['status'] ?? 'present';
        $attendance = ExamAttendance::updateOrCreate(
            [
                'organization_id' => $profile->organization_id,
                'school_id' => $currentSchoolId,
                'exam_time_id' => $examTime->id,
                'student_id' => $student->id,
            ],
            [
                'school_id' => $currentSchoolId,
                'exam_id' => $examId,
                'exam_class_id' => $examTime->exam_class_id,
                'exam_subject_id' => $examTime->exam_subject_id,
                'status' => $status,
                'checked_in_at' => now(),
                'notes' => $validated['notes'] ?? null,
            ]
        );

        // Load relationships and get roll number
        $attendance->load(['student', 'examTime', 'examClass', 'examSubject']);

        // Get roll number from exam student
        $rollNumber = $examStudent->exam_roll_number;

        // Add roll number to response
        $attendanceData = $attendance->toArray();
        $attendanceData['roll_number'] = $rollNumber;

        return response()->json($attendanceData, 200);
    }

    /**
     * Get scan feed (recent scans for a timeslot)
     * GET /api/exams/{exam}/attendance/timeslot/{examTimeId}/scans
     */
    public function scanFeed(Request $request, string $examId, string $examTimeId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('exams.view_attendance_reports')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.view_attendance_reports: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Verify exam belongs to organization
        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $examId)
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        // Verify exam time slot
        $examTime = ExamTime::where('id', $examTimeId)
            ->where('exam_id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$examTime) {
            return response()->json(['error' => 'Exam time slot not found'], 404);
        }

        $limit = (int) $request->input('limit', 30);
        $limit = $limit > 100 ? 100 : $limit;

        // Get recent attendance records for this timeslot, ordered by checked_in_at or created_at
        $scans = ExamAttendance::with(['student:id,full_name,father_name,admission_no,card_number,student_code'])
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('exam_time_id', $examTimeId)
            ->whereNull('deleted_at')
            ->orderBy('checked_in_at', 'desc')
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();

        // Add roll numbers and ensure student data is properly included
        $scansWithRollNumbers = $scans->map(function ($scan) use ($examId, $profile, $currentSchoolId) {
            $examStudent = ExamStudent::where('exam_id', $examId)
                ->where('exam_class_id', $scan->exam_class_id)
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereHas('studentAdmission', function ($query) use ($scan) {
                    $query->where('student_id', $scan->student_id);
                })
                ->whereNull('deleted_at')
                ->first();

            $scanData = $scan->toArray();
            $scanData['roll_number'] = $examStudent?->exam_roll_number ?? null;

            // Ensure student data is properly included with all fields
            if ($scan->student) {
                $scanData['student'] = [
                    'id' => $scan->student->id,
                    'full_name' => $scan->student->full_name,
                    'father_name' => $scan->student->father_name,
                    'admission_no' => $scan->student->admission_no,
                    'card_number' => $scan->student->card_number,
                    'student_code' => $scan->student->student_code,
                ];
            }

            return $scanData;
        });

        return response()->json($scansWithRollNumbers);
    }
}
