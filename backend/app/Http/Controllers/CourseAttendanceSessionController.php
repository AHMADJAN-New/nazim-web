<?php

namespace App\Http\Controllers;

use App\Models\CourseAttendanceRecord;
use App\Models\CourseAttendanceSession;
use App\Models\CourseStudent;
use App\Models\ShortTermCourse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CourseAttendanceSessionController extends Controller
{
    private function getProfile($user)
    {
        return DB::table('profiles')->where('id', (string) $user->id)->first();
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('course_attendance.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseAttendanceSessionController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $query = CourseAttendanceSession::where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->with(['course:id,name', 'records']);

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

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('course_attendance.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseAttendanceSessionController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'course_id' => 'required|uuid|exists:short_term_courses,id',
            'session_date' => 'required|date',
            'session_title' => 'nullable|string|max:255',
            'method' => 'required|in:manual,barcode',
            'remarks' => 'nullable|string',
        ]);

        // Verify course belongs to organization
        $course = ShortTermCourse::where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->find($validated['course_id']);

        if (!$course) {
            return response()->json(['error' => 'Course not found'], 404);
        }

        $validated['organization_id'] = $profile->organization_id;
        $validated['created_by'] = (string) $user->id;

        $session = CourseAttendanceSession::create($validated);
        $session->load('course:id,name');
        $session->stats = $session->getAttendanceStats();

        return response()->json($session, 201);
    }

    public function show(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('course_attendance.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $session = CourseAttendanceSession::where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->with(['course:id,name,instructor_name', 'records.courseStudent:id,full_name,admission_no,card_number'])
            ->find($id);

        if (!$session) {
            return response()->json(['error' => 'Session not found'], 404);
        }

        $session->stats = $session->getAttendanceStats();

        return response()->json($session);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('course_attendance.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $session = CourseAttendanceSession::where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$session) {
            return response()->json(['error' => 'Session not found'], 404);
        }

        $validated = $request->validate([
            'session_date' => 'sometimes|date',
            'session_title' => 'nullable|string|max:255',
            'method' => 'sometimes|in:manual,barcode',
            'remarks' => 'nullable|string',
        ]);

        $session->update($validated);
        $session->load('course:id,name');
        $session->stats = $session->getAttendanceStats();

        return response()->json($session);
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('course_attendance.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $session = CourseAttendanceSession::where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$session) {
            return response()->json(['error' => 'Session not found'], 404);
        }

        $session->delete();

        return response()->noContent();
    }

    public function roster(Request $request)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('course_attendance.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseAttendanceSessionController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $request->validate([
            'course_id' => 'required|uuid|exists:short_term_courses,id',
        ]);

        // Verify course belongs to user's organization
        $course = ShortTermCourse::where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->find($request->course_id);

        if (!$course) {
            return response()->json(['error' => 'Course not found'], 404);
        }

        $students = CourseStudent::where('organization_id', $profile->organization_id)
            ->where('course_id', $request->course_id)
            ->where('completion_status', 'enrolled')
            ->whereNull('deleted_at')
            ->select(['id', 'admission_no', 'card_number', 'full_name', 'father_name', 'picture_path'])
            ->orderBy('full_name')
            ->get();

        return response()->json($students);
    }

    public function markRecords(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('course_attendance.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $session = CourseAttendanceSession::where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$session) {
            return response()->json(['error' => 'Session not found'], 404);
        }

        $validated = $request->validate([
            'records' => 'required|array|min:1',
            'records.*.course_student_id' => 'required|uuid|exists:course_students,id',
            'records.*.status' => 'required|in:present,absent,late,excused,sick,leave',
            'records.*.note' => 'nullable|string',
        ]);

        $created = [];

        foreach ($validated['records'] as $record) {
            $created[] = CourseAttendanceRecord::updateOrCreate(
                [
                    'attendance_session_id' => $session->id,
                    'course_student_id' => $record['course_student_id'],
                ],
                [
                    'organization_id' => $profile->organization_id,
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

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('course_attendance.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $session = CourseAttendanceSession::where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$session) {
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
            ->where('course_id', $session->course_id)
            ->where('completion_status', 'enrolled')
            ->whereNull('deleted_at')
            ->where(function ($q) use ($searchTerm) {
                $q->where('card_number', $searchTerm)
                    ->orWhere('admission_no', $searchTerm);
            })
            ->first();

        if (!$student) {
            return response()->json(['error' => 'Student not found or not enrolled in this course'], 404);
        }

        $record = CourseAttendanceRecord::updateOrCreate(
            [
                'attendance_session_id' => $session->id,
                'course_student_id' => $student->id,
            ],
            [
                'organization_id' => $profile->organization_id,
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

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $session = CourseAttendanceSession::where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$session) {
            return response()->json(['error' => 'Session not found'], 404);
        }

        $limit = $request->input('limit', 10);

        $scans = CourseAttendanceRecord::where('attendance_session_id', $session->id)
            ->where('entry_method', 'barcode')
            ->whereNull('deleted_at')
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

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('course_attendance.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $session = CourseAttendanceSession::where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$session) {
            return response()->json(['error' => 'Session not found'], 404);
        }

        $session->close((string) $user->id);
        $session->load('course:id,name');
        $session->stats = $session->getAttendanceStats();

        return response()->json($session);
    }

    public function report(Request $request)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $request->validate([
            'course_id' => 'required|uuid|exists:short_term_courses,id',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
        ]);

        $query = CourseAttendanceRecord::where('organization_id', $profile->organization_id)
            ->where('course_id', $request->course_id)
            ->whereNull('deleted_at')
            ->with(['courseStudent:id,full_name,admission_no', 'session:id,session_date']);

        if ($request->filled('date_from')) {
            $query->whereHas('session', function ($q) use ($request) {
                $q->whereDate('session_date', '>=', $request->date_from);
            });
        }

        if ($request->filled('date_to')) {
            $query->whereHas('session', function ($q) use ($request) {
                $q->whereDate('session_date', '<=', $request->date_to);
            });
        }

        $records = $query->get();

        // Group by student
        $grouped = $records->groupBy('course_student_id')->map(function ($studentRecords) {
            $student = $studentRecords->first()->courseStudent;
            $total = $studentRecords->count();
            $present = $studentRecords->where('status', 'present')->count();
            $late = $studentRecords->where('status', 'late')->count();
            $absent = $studentRecords->where('status', 'absent')->count();

            return [
                'student_id' => $student->id ?? null,
                'student_name' => $student->full_name ?? 'Unknown',
                'admission_no' => $student->admission_no ?? '',
                'total_sessions' => $total,
                'present' => $present,
                'late' => $late,
                'absent' => $absent,
                'attendance_rate' => $total > 0 ? round((($present + $late) / $total) * 100, 1) : 0,
            ];
        })->values();

        return response()->json($grouped);
    }
}
