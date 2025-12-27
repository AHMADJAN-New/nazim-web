<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreLeaveRequest;
use App\Http\Requests\UpdateLeaveRequest;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\LeaveRequest;
use App\Models\Student;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class LeaveRequestController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('leave_requests.read')) {
                return response()->json(['error' => 'Access Denied'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for leave_requests.read: ' . $e->getMessage());
            return response()->json(['error' => 'Access Denied'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $query = LeaveRequest::with([
            'student',
            'classModel',
            'school',
            'academicYear',
            'approver'
        ])
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at'); // Only get non-deleted leave requests

        if ($request->filled('student_id')) {
            $query->where('student_id', $request->input('student_id'));
        }

        if ($request->filled('class_id')) {
            $query->where('class_id', $request->input('class_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('month')) {
            $query->whereMonth('start_date', $request->integer('month'));
        }

        if ($request->filled('year')) {
            $query->whereYear('start_date', $request->integer('year'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('start_date', '>=', Carbon::parse($request->input('date_from'))->toDateString());
        }

        if ($request->filled('date_to')) {
            $query->whereDate('end_date', '<=', Carbon::parse($request->input('date_to'))->toDateString());
        }

        $query->orderByDesc('start_date');

        $perPage = $request->integer('per_page', 25);
        $allowedPerPage = [10, 25, 50, 100];
        if (!in_array($perPage, $allowedPerPage, true)) {
            $perPage = 25;
        }

        try {
            $requests = $query->paginate($perPage);
            return response()->json($requests);
        } catch (\Exception $e) {
            Log::error('Error fetching leave requests', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => $user->id,
                'organization_id' => $profile->organization_id,
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json([
                'error' => 'Failed to fetch leave requests. Please try again.',
                'message' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    public function store(StoreLeaveRequest $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('leave_requests.create')) {
                return response()->json(['error' => 'Access Denied'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for leave_requests.create: ' . $e->getMessage());
            return response()->json(['error' => 'Access Denied'], 403);
        }

        $validated = $request->validated();

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $student = Student::where('id', $validated['student_id'])
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->first();

        if (!$student) {
            return response()->json(['error' => 'Student not found for this school'], 404);
        }

        $leaveRequest = LeaveRequest::create([
            'organization_id' => $profile->organization_id,
            'student_id' => $validated['student_id'],
            'class_id' => $validated['class_id'] ?? null,
            'school_id' => $currentSchoolId,
            'academic_year_id' => $validated['academic_year_id'] ?? null,
            'leave_type' => $validated['leave_type'],
            'start_date' => Carbon::parse($validated['start_date'])->toDateString(),
            'end_date' => Carbon::parse($validated['end_date'])->toDateString(),
            'start_time' => $validated['start_time'] ?? null,
            'end_time' => $validated['end_time'] ?? null,
            'reason' => $validated['reason'],
            'status' => 'pending',
            'approval_note' => $validated['approval_note'] ?? null,
            'created_by' => $user->id,
            'qr_token' => (string) Str::uuid(),
        ]);

        return response()->json($leaveRequest->load(['student', 'classModel', 'school', 'academicYear']), 201);
    }

    public function show(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('leave_requests.read')) {
                return response()->json(['error' => 'Access Denied'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for leave_requests.read: ' . $e->getMessage());
            return response()->json(['error' => 'Access Denied'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId(request());
        $requestModel = LeaveRequest::with(['student', 'classModel', 'school', 'academicYear', 'approver'])
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at');

        $requestModel = $requestModel->find($id);

        if (!$requestModel) {
            return response()->json(['error' => 'Leave request not found'], 404);
        }

        return response()->json($requestModel);
    }

    public function update(UpdateLeaveRequest $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('leave_requests.update')) {
                return response()->json(['error' => 'Access Denied'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for leave_requests.update: ' . $e->getMessage());
            return response()->json(['error' => 'Access Denied'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $leave = LeaveRequest::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$leave) {
            return response()->json(['error' => 'Leave request not found'], 404);
        }

        $validated = $request->validated();
        // Prevent scope changes
        unset($validated['school_id'], $validated['organization_id']);
        $leave->update($validated);

        return response()->json($leave->fresh(['student', 'classModel', 'school', 'academicYear', 'approver']));
    }

    public function approve(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('leave_requests.update')) {
                return response()->json(['error' => 'Access Denied'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for leave_requests.update: ' . $e->getMessage());
            return response()->json(['error' => 'Access Denied'], 403);
        }

        $request->validate([
            'approval_note' => 'nullable|string|max:500',
        ]);

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $leave = LeaveRequest::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$leave) {
            return response()->json(['error' => 'Leave request not found'], 404);
        }

        if ($leave->status === 'approved') {
            return response()->json($leave);
        }

        $leave->update([
            'status' => 'approved',
            'approved_by' => $user->id,
            'approved_at' => now(),
            'approval_note' => $request->input('approval_note') ?? $leave->approval_note,
        ]);

        $this->markAttendanceForLeave($leave, $profile->organization_id, $user->id);

        return response()->json($leave->fresh(['student', 'classModel', 'school', 'academicYear', 'approver']));
    }

    public function reject(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('leave_requests.update')) {
                return response()->json(['error' => 'Access Denied'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for leave_requests.update: ' . $e->getMessage());
            return response()->json(['error' => 'Access Denied'], 403);
        }

        $request->validate([
            'approval_note' => 'nullable|string|max:500',
        ]);

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $leave = LeaveRequest::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$leave) {
            return response()->json(['error' => 'Leave request not found'], 404);
        }

        $leave->update([
            'status' => 'rejected',
            'approved_by' => $user->id,
            'approved_at' => now(),
            'approval_note' => $request->input('approval_note') ?? $leave->approval_note,
        ]);

        return response()->json($leave->fresh(['student', 'classModel', 'school', 'academicYear', 'approver']));
    }

    public function printData(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('leave_requests.read')) {
                return response()->json(['error' => 'Access Denied'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for leave_requests.read: ' . $e->getMessage());
            return response()->json(['error' => 'Access Denied'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId(request());
        $leave = LeaveRequest::with(['student', 'classModel', 'school'])
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$leave) {
            return response()->json(['error' => 'Leave request not found'], 404);
        }

        $scanUrl = url('/api/leave-requests/scan/' . $leave->qr_token);

        return response()->json([
            'request' => $leave,
            'scan_url' => $scanUrl,
        ]);
    }

    public function scanPublic(string $token)
    {
        $leave = LeaveRequest::with(['student', 'classModel', 'school'])
            ->where('qr_token', $token)
            ->first();

        if (!$leave) {
            return response()->json(['error' => 'Leave request not found'], 404);
        }

        if (!$leave->qr_used_at) {
            $leave->qr_used_at = now();
            $leave->save();
        }

        return response()->json([
            'request' => $leave,
            'used' => (bool) $leave->qr_used_at,
            'student' => $leave->student,
        ]);
    }

    protected function markAttendanceForLeave(LeaveRequest $leave, string $organizationId, string $userId): void
    {
        $start = Carbon::parse($leave->start_date)->startOfDay();
        $end = Carbon::parse($leave->end_date)->endOfDay();

        if (!$leave->class_id) {
            return;
        }

        $sessions = AttendanceSession::where('organization_id', $organizationId)
            ->where('school_id', $leave->school_id)
            ->whereBetween('session_date', [$start->toDateString(), $end->toDateString()])
            ->where(function ($q) use ($leave) {
                $q->where('class_id', $leave->class_id)
                    ->orWhereHas('classes', function ($cq) use ($leave) {
                        $cq->where('classes.id', $leave->class_id);
                    });
            })
            ->get();

        foreach ($sessions as $session) {
            AttendanceRecord::updateOrCreate(
                [
                    'attendance_session_id' => $session->id,
                    'student_id' => $leave->student_id,
                ],
                [
                    'organization_id' => $organizationId,
                    'school_id' => $session->school_id,
                    'status' => 'leave',
                    'entry_method' => $session->method,
                    'marked_at' => now(),
                    'marked_by' => $userId,
                    'note' => $leave->reason,
                ]
            );
        }
    }
}
