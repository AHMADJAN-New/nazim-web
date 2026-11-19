<?php

namespace App\Http\Controllers;

use App\Models\CourseAttendanceGroup;
use App\Models\CourseAttendanceGroupStudent;
use App\Models\CourseAttendanceRecord;
use App\Models\CourseAttendanceSession;
use App\Models\CourseStudent;
use App\Models\ShortTermCourse;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CourseAttendanceSessionController extends Controller
{
    public function __construct(
        private ActivityLogService $activityLogService
    ) {}

    private function getProfile($user)
    {
        return DB::table('profiles')->where('id', (string) $user->id)->first();
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (! $profile || ! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('course_attendance.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseAttendanceSessionController] permission check failed', ['error' => $e->getMessage()]);

            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $query = CourseAttendanceSession::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->with(['course:id,name', 'records', 'attendanceGroup:id,name']);

        if ($request->filled('course_id')) {
            $query->where('course_id', $request->course_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('session_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('session_date', '<=', $request->date_to);
        }

        $sessions = $query->orderBy('session_date', 'desc')->get();

        // Add stats to each session
        $sessions->transform(function ($session) {
            $session->stats = $session->getAttendanceStats();

            return $session;
        });

        return response()->json($sessions);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (! $profile || ! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('course_attendance.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseAttendanceSessionController] permission check failed', ['error' => $e->getMessage()]);

            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'course_id' => 'required|uuid|exists:short_term_courses,id',
            'attendance_group_id' => 'nullable|uuid',
            'session_date' => 'required|date',
            'session_title' => 'nullable|string|max:255',
            'method' => 'required|in:manual,barcode',
            'remarks' => 'nullable|string',
        ]);

        // Verify course belongs to organization
        $course = ShortTermCourse::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($validated['course_id']);

        if (! $course) {
            return response()->json(['error' => 'Course not found'], 404);
        }

        $group = $this->findAttendanceGroupForCourse(
            $validated['attendance_group_id'] ?? null,
            $course->id,
            $profile->organization_id,
            $currentSchoolId
        );
        if ($group instanceof \Illuminate\Http\JsonResponse) {
            return $group;
        }

        $validated['attendance_group_id'] = $group?->id;
        $validated['organization_id'] = $profile->organization_id;
        $validated['school_id'] = $currentSchoolId;
        $validated['created_by'] = (string) $user->id;

        $session = CourseAttendanceSession::create($validated);
        $session->load(['course:id,name', 'attendanceGroup:id,name']);
        $session->stats = $session->getAttendanceStats();

        // Log attendance session creation
        try {
            $courseName = $session->course?->name ?? 'Unknown';
            $this->activityLogService->logCreate(
                subject: $session,
                description: "Created attendance session for course {$courseName} on {$session->session_date}",
                properties: [
                    'course_attendance_session_id' => $session->id,
                    'course_id' => $session->course_id,
                    'session_date' => $session->session_date,
                    'method' => $session->method,
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log attendance session creation: '.$e->getMessage());
        }

        return response()->json($session, 201);
    }

    public function show(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (! $profile || ! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('course_attendance.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $session = CourseAttendanceSession::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->with(['course:id,name,instructor_name', 'attendanceGroup:id,name', 'records.courseStudent:id,full_name,admission_no,card_number'])
            ->find($id);

        if (! $session) {
            return response()->json(['error' => 'Session not found'], 404);
        }

        $session->stats = $session->getAttendanceStats();

        return response()->json($session);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (! $profile || ! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('course_attendance.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $session = CourseAttendanceSession::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (! $session) {
            return response()->json(['error' => 'Session not found'], 404);
        }

        // Capture old values before update
        $oldValues = $session->only(['session_date', 'session_title', 'method', 'remarks']);

        $validated = $request->validate([
            'session_date' => 'sometimes|date',
            'session_title' => 'nullable|string|max:255',
            'method' => 'sometimes|in:manual,barcode',
            'remarks' => 'nullable|string',
            'attendance_group_id' => 'sometimes|nullable|uuid',
        ]);

        if (array_key_exists('attendance_group_id', $validated)) {
            $group = $this->findAttendanceGroupForCourse(
                $validated['attendance_group_id'],
                $session->course_id,
                $profile->organization_id,
                $currentSchoolId
            );
            if ($group instanceof \Illuminate\Http\JsonResponse) {
                return $group;
            }
            $validated['attendance_group_id'] = $group?->id;
        }

        $session->update($validated);
        $session->load(['course:id,name', 'attendanceGroup:id,name']);
        $session->stats = $session->getAttendanceStats();

        // Log attendance session update
        try {
            $courseName = $session->course?->name ?? 'Unknown';
            $this->activityLogService->logUpdate(
                subject: $session,
                description: "Updated attendance session for course {$courseName} on {$session->session_date}",
                properties: [
                    'course_attendance_session_id' => $session->id,
                    'course_id' => $session->course_id,
                    'old_values' => $oldValues,
                    'new_values' => $session->only(['session_date', 'session_title', 'method', 'remarks']),
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log attendance session update: '.$e->getMessage());
        }

        return response()->json($session);
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (! $profile || ! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('course_attendance.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $session = CourseAttendanceSession::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (! $session) {
            return response()->json(['error' => 'Session not found'], 404);
        }

        // Load course for logging
        $session->load('course');

        // Log attendance session deletion
        try {
            $courseName = $session->course?->name ?? 'Unknown';
            $this->activityLogService->logDelete(
                subject: $session,
                description: "Deleted attendance session for course {$courseName} on {$session->session_date}",
                properties: [
                    'course_attendance_session_id' => $session->id,
                    'course_id' => $session->course_id,
                    'session_date' => $session->session_date,
                    'deleted_entity' => $session->toArray(),
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log attendance session deletion: '.$e->getMessage());
        }

        $session->delete();

        return response()->noContent();
    }

    public function roster(Request $request)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (! $profile || ! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('course_attendance.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseAttendanceSessionController] permission check failed', ['error' => $e->getMessage()]);

            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $request->validate([
            'course_id' => 'required|uuid|exists:short_term_courses,id',
            'attendance_group_id' => 'nullable|uuid',
        ]);

        // Verify course belongs to user's organization
        $course = ShortTermCourse::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($request->course_id);

        if (! $course) {
            return response()->json(['error' => 'Course not found'], 404);
        }

        $studentsQuery = CourseStudent::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('course_id', $request->course_id)
            ->where('completion_status', 'enrolled')
            ->whereNull('deleted_at');

        if ($request->filled('attendance_group_id')) {
            $group = $this->findAttendanceGroupForCourse(
                $request->attendance_group_id,
                $course->id,
                $profile->organization_id,
                $currentSchoolId
            );
            if ($group instanceof \Illuminate\Http\JsonResponse) {
                return $group;
            }

            $memberIds = $this->attendanceGroupMemberIds($group->id, $profile->organization_id, $currentSchoolId);
            $studentsQuery->whereIn('id', $memberIds);
        }

        $students = $studentsQuery
            ->select(['id', 'admission_no', 'card_number', 'full_name', 'father_name', 'picture_path'])
            ->orderBy('full_name')
            ->get();

        return response()->json($students);
    }

    public function markRecords(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (! $profile || ! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('course_attendance.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $session = CourseAttendanceSession::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (! $session) {
            return response()->json(['error' => 'Session not found'], 404);
        }

        $validated = $request->validate([
            'records' => 'required|array|min:1',
            'records.*.course_student_id' => 'required|uuid|exists:course_students,id',
            'records.*.status' => 'required|in:present,absent,late,excused,sick,leave',
            'records.*.note' => 'nullable|string',
        ]);

        if ($session->attendance_group_id) {
            $memberIds = $this->attendanceGroupMemberIds(
                $session->attendance_group_id,
                $profile->organization_id,
                $currentSchoolId
            );
            $requestedIds = collect($validated['records'])->pluck('course_student_id');
            if ($requestedIds->diff($memberIds)->isNotEmpty()) {
                return response()->json(['error' => 'One or more students are not in this attendance group'], 422);
            }
        }

        $created = [];

        foreach ($validated['records'] as $record) {
            $created[] = CourseAttendanceRecord::updateOrCreate(
                [
                    'attendance_session_id' => $session->id,
                    'course_student_id' => $record['course_student_id'],
                ],
                [
                    'organization_id' => $profile->organization_id,
                    'school_id' => $currentSchoolId,
                    'course_id' => $session->course_id,
                    'status' => $record['status'],
                    'entry_method' => 'manual',
                    'marked_at' => now(),
                    'marked_by' => (string) $user->id,
                    'note' => $record['note'] ?? null,
                ]
            );
        }

        return response()->json($created);
    }

    public function scan(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (! $profile || ! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('course_attendance.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $session = CourseAttendanceSession::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (! $session) {
            return response()->json(['error' => 'Session not found'], 404);
        }

        if ($session->status === 'closed') {
            return response()->json(['error' => 'Session is closed'], 400);
        }

        $validated = $request->validate([
            'code' => 'required|string',
            'status' => 'nullable|in:present,absent,late,excused,sick,leave',
        ]);

        $searchTerm = trim($validated['code']);
        $status = $validated['status'] ?? 'present';

        // Find student by card_number or admission_no
        $student = CourseStudent::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('course_id', $session->course_id)
            ->where('completion_status', 'enrolled')
            ->whereNull('deleted_at')
            ->where(function ($q) use ($searchTerm) {
                $q->where('card_number', $searchTerm)
                    ->orWhere('admission_no', $searchTerm);
            })
            ->first();

        if (! $student) {
            return response()->json(['error' => 'Student not found or not enrolled in this course'], 404);
        }

        if ($session->attendance_group_id) {
            $isMember = $this->attendanceGroupMemberIds(
                $session->attendance_group_id,
                $profile->organization_id,
                $currentSchoolId
            )->contains($student->id);

            if (! $isMember) {
                return response()->json(['error' => 'Student is not in this attendance group'], 422);
            }
        }

        $record = CourseAttendanceRecord::updateOrCreate(
            [
                'attendance_session_id' => $session->id,
                'course_student_id' => $student->id,
            ],
            [
                'organization_id' => $profile->organization_id,
                'school_id' => $currentSchoolId,
                'course_id' => $session->course_id,
                'status' => $status,
                'entry_method' => 'barcode',
                'marked_at' => now(),
                'marked_by' => (string) $user->id,
            ]
        );

        $record->load('courseStudent:id,full_name,admission_no,card_number,picture_path');

        return response()->json($record);
    }

    public function scans(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (! $profile || ! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $session = CourseAttendanceSession::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (! $session) {
            return response()->json(['error' => 'Session not found'], 404);
        }

        $limit = $request->input('limit', 10);

        $scans = CourseAttendanceRecord::where('attendance_session_id', $session->id)
            ->where('entry_method', 'barcode')
            ->whereNull('deleted_at')
            ->where('school_id', $currentSchoolId)
            ->with('courseStudent:id,full_name,admission_no,card_number,picture_path')
            ->orderBy('marked_at', 'desc')
            ->limit($limit)
            ->get();

        return response()->json($scans);
    }

    public function close(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (! $profile || ! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('course_attendance.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $session = CourseAttendanceSession::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (! $session) {
            return response()->json(['error' => 'Session not found'], 404);
        }

        $session->close((string) $user->id);
        $session->load('course:id,name');
        $session->stats = $session->getAttendanceStats();

        return response()->json($session);
    }

    public function sessionReport(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (! $profile || ! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('course_attendance.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseAttendanceSessionController] permission check failed', ['error' => $e->getMessage()]);

            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $session = CourseAttendanceSession::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (! $session) {
            return response()->json(['error' => 'Session not found'], 404);
        }

        // Get all enrolled students for the course
        $enrolledStudentsQuery = CourseStudent::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('course_id', $session->course_id)
            ->where('completion_status', 'enrolled')
            ->whereNull('deleted_at');

        if ($session->attendance_group_id) {
            $memberIds = $this->attendanceGroupMemberIds(
                $session->attendance_group_id,
                $profile->organization_id,
                $currentSchoolId
            );
            $enrolledStudentsQuery->whereIn('id', $memberIds);
        }

        $enrolledStudents = $enrolledStudentsQuery
            ->select(['id', 'full_name', 'father_name', 'card_number', 'admission_no'])
            ->orderBy('full_name')
            ->get();

        // Get attendance records for this session
        $attendanceRecords = CourseAttendanceRecord::where('attendance_session_id', $session->id)
            ->whereNull('deleted_at')
            ->get()
            ->keyBy('course_student_id');

        // Build report: merge students with their attendance records
        $report = $enrolledStudents->map(function ($student) use ($attendanceRecords) {
            $record = $attendanceRecords->get($student->id);

            return [
                'course_student_id' => $student->id,
                'student_name' => $student->full_name,
                'father_name' => $student->father_name,
                'card_number' => $student->card_number,
                'admission_no' => $student->admission_no,
                'status' => $record ? $record->status : 'absent',
                'note' => $record ? $record->note : null,
                'has_record' => $record !== null,
            ];
        })->values();

        return response()->json($report);
    }

    public function report(Request $request)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (! $profile || ! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('course_attendance.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseAttendanceSessionController] permission check failed', ['error' => $e->getMessage()]);

            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $request->validate([
            'course_id' => 'required|uuid|exists:short_term_courses,id',
            'completion_status' => 'nullable|in:enrolled,completed,dropped,failed',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
        ]);

        // Verify course belongs to organization
        $course = ShortTermCourse::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($request->course_id);

        if (! $course) {
            return response()->json(['error' => 'Course not found'], 404);
        }

        // Get all students for the course (filtered by completion_status if provided)
        $studentsQuery = CourseStudent::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('course_id', $request->course_id)
            ->whereNull('deleted_at');

        if ($request->filled('completion_status')) {
            $studentsQuery->where('completion_status', $request->completion_status);
        }

        $students = $studentsQuery->select(['id', 'full_name', 'father_name', 'card_number', 'admission_no', 'completion_status'])
            ->orderBy('full_name')
            ->get();

        // Get all attendance records for the course
        $recordsQuery = CourseAttendanceRecord::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('course_id', $request->course_id)
            ->whereNull('deleted_at')
            ->with(['session:id,session_date']);

        if ($request->filled('date_from')) {
            $recordsQuery->whereHas('session', function ($q) use ($request) {
                $q->whereDate('session_date', '>=', $request->date_from);
            });
        }

        if ($request->filled('date_to')) {
            $recordsQuery->whereHas('session', function ($q) use ($request) {
                $q->whereDate('session_date', '<=', $request->date_to);
            });
        }

        $records = $recordsQuery->get();

        // Group records by student
        $recordsByStudent = $records->groupBy('course_student_id');

        // Build report: include all students, even those without attendance records
        $report = $students->map(function ($student) use ($recordsByStudent) {
            $studentRecords = $recordsByStudent->get($student->id, collect());

            $total = $studentRecords->count();
            $present = $studentRecords->where('status', 'present')->count();
            $late = $studentRecords->where('status', 'late')->count();
            $absent = $studentRecords->where('status', 'absent')->count();
            $excused = $studentRecords->where('status', 'excused')->count();
            $sick = $studentRecords->where('status', 'sick')->count();
            $leave = $studentRecords->where('status', 'leave')->count();

            // Attendance rate: (present + late) / total sessions
            // If no sessions, rate is 0
            $attendanceRate = $total > 0 ? round((($present + $late) / $total) * 100, 1) : 0;

            return [
                'course_student_id' => $student->id,
                'student_name' => $student->full_name,
                'father_name' => $student->father_name,
                'card_number' => $student->card_number,
                'admission_no' => $student->admission_no,
                'completion_status' => $student->completion_status,
                'total_sessions' => $total,
                'present' => $present,
                'late' => $late,
                'absent' => $absent,
                'excused' => $excused,
                'sick' => $sick,
                'leave' => $leave,
                'attendance_rate' => $attendanceRate,
            ];
        })->values();

        return response()->json($report);
    }

    private function findAttendanceGroupForCourse(
        ?string $groupId,
        string $courseId,
        string $organizationId,
        string $schoolId
    ): CourseAttendanceGroup|\Illuminate\Http\JsonResponse|null {
        if ($groupId === null || $groupId === '') {
            return null;
        }

        $group = CourseAttendanceGroup::query()
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->where('course_id', $courseId)
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->find($groupId);

        if (! $group) {
            return response()->json(['error' => 'Attendance group not found for this course'], 404);
        }

        return $group;
    }

    private function attendanceGroupMemberIds(string $groupId, string $organizationId, string $schoolId): \Illuminate\Support\Collection
    {
        return CourseAttendanceGroupStudent::query()
            ->where('course_attendance_group_id', $groupId)
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->pluck('course_student_id');
    }
}
