<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreLeaveRequest;
use App\Http\Requests\UpdateLeaveRequest;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\LeaveRequest;
use App\Models\Student;
use App\Services\Reports\DateConversionService;
use App\Services\Reports\ReportConfig;
use App\Services\Reports\ReportService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class LeaveRequestController extends Controller
{
    public function __construct(
        private ReportService $reportService,
        private DateConversionService $dateService
    ) {}
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

    /**
     * Generate leave requests report
     * 
     * POST /api/leave-requests/generate-report
     */
    public function generateReport(Request $request)
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

        $validated = $request->validate([
            'report_type' => 'required|in:pdf,excel',
            'report_variant' => 'required|in:all,pending,approved,rejected,daily',
            'branding_id' => 'nullable|uuid',
            'calendar_preference' => 'nullable|in:gregorian,jalali,qamari',
            'language' => 'nullable|in:en,ps,fa,ar',
            'student_id' => 'nullable|uuid',
            'class_id' => 'nullable|uuid',
            'school_id' => 'nullable|uuid',
            'status' => 'nullable|in:pending,approved,rejected,cancelled',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
        ]);

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $calendarPreference = $validated['calendar_preference'] ?? 'jalali';
        $language = $validated['language'] ?? 'ps';

        // Build query based on filters
        $query = LeaveRequest::with(['student', 'classModel', 'school', 'academicYear', 'approver'])
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at');

        // Apply filters
        if (!empty($validated['student_id'])) {
            $query->where('student_id', $validated['student_id']);
        }
        if (!empty($validated['class_id'])) {
            $query->where('class_id', $validated['class_id']);
        }
        if (!empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }
        if (!empty($validated['date_from'])) {
            $query->whereDate('start_date', '>=', Carbon::parse($validated['date_from'])->toDateString());
        }
        if (!empty($validated['date_to'])) {
            $query->whereDate('end_date', '<=', Carbon::parse($validated['date_to'])->toDateString());
        }

        // Apply report variant filter
        $reportVariant = $validated['report_variant'];
        if ($reportVariant === 'pending') {
            $query->where('status', 'pending');
        } elseif ($reportVariant === 'approved') {
            $query->where('status', 'approved');
        } elseif ($reportVariant === 'rejected') {
            $query->where('status', 'rejected');
        }
        // 'all' and 'daily' include all statuses

        $requests = $query->orderBy('start_date', 'desc')->get();

        // Prepare report data
        $columns = [];
        $rows = [];
        $title = '';
        $dateRangeText = '';

        // Build date range text
        if (!empty($validated['date_from']) && !empty($validated['date_to'])) {
            $dateFrom = $this->dateService->formatDate($validated['date_from'], $calendarPreference, 'full', $language);
            $dateTo = $this->dateService->formatDate($validated['date_to'], $calendarPreference, 'full', $language);
            $dateRangeText = "{$dateFrom} - {$dateTo}";
        } elseif (!empty($validated['date_from'])) {
            $dateFrom = $this->dateService->formatDate($validated['date_from'], $calendarPreference, 'full', $language);
            $dateRangeText = "From: {$dateFrom}";
        } elseif (!empty($validated['date_to'])) {
            $dateTo = $this->dateService->formatDate($validated['date_to'], $calendarPreference, 'full', $language);
            $dateRangeText = "Until: {$dateTo}";
        }

        if ($reportVariant === 'daily') {
            // Daily breakdown report
            $title = 'Daily Leave Breakdown Report';
            $columns = [
                ['key' => 'date', 'label' => 'Date', 'type' => 'text'],
                ['key' => 'total', 'label' => 'Total', 'type' => 'numeric'],
                ['key' => 'approved', 'label' => 'Approved', 'type' => 'numeric'],
                ['key' => 'pending', 'label' => 'Pending', 'type' => 'numeric'],
                ['key' => 'rejected', 'label' => 'Rejected', 'type' => 'numeric'],
            ];

            // Group by date
            $grouped = $requests->groupBy(function ($req) {
                return Carbon::parse($req->start_date)->format('Y-m-d');
            });

            $totalApproved = 0;
            $totalPending = 0;
            $totalRejected = 0;

            foreach ($grouped as $date => $dayRequests) {
                $approved = $dayRequests->where('status', 'approved')->count();
                $pending = $dayRequests->where('status', 'pending')->count();
                $rejected = $dayRequests->where('status', 'rejected')->count();
                
                $totalApproved += $approved;
                $totalPending += $pending;
                $totalRejected += $rejected;

                $rows[] = [
                    'date' => $this->dateService->formatDate($date, $calendarPreference, 'full', $language),
                    'total' => $dayRequests->count(),
                    'approved' => $approved,
                    'pending' => $pending,
                    'rejected' => $rejected,
                ];
            }

            // Add totals for Excel
            if ($validated['report_type'] === 'excel' && count($rows) > 0) {
                $totals = [
                    'date' => 'TOTAL',
                    'total' => array_sum(array_column($rows, 'total')),
                    'approved' => $totalApproved,
                    'pending' => $totalPending,
                    'rejected' => $totalRejected,
                ];
            }
        } else {
            // Standard list report
            $variantTitles = [
                'all' => 'All Leave Requests',
                'pending' => 'Pending Leave Requests',
                'approved' => 'Approved Leave Requests',
                'rejected' => 'Rejected Leave Requests',
            ];
            $title = $variantTitles[$reportVariant] ?? 'Leave Requests Report';

            $columns = [
                ['key' => 'student_name', 'label' => 'Student'],
                ['key' => 'admission_no', 'label' => 'Admission No'],
                ['key' => 'class_name', 'label' => 'Class'],
                ['key' => 'start_date', 'label' => 'Start Date'],
                ['key' => 'end_date', 'label' => 'End Date'],
                ['key' => 'status', 'label' => 'Status'],
                ['key' => 'reason', 'label' => 'Reason'],
            ];

            foreach ($requests as $req) {
                $rows[] = [
                    'student_name' => $req->student?->full_name ?? '—',
                    'admission_no' => $req->student?->admission_no ?? '—',
                    'class_name' => $req->classModel?->name ?? '—',
                    'start_date' => $this->dateService->formatDate($req->start_date, $calendarPreference, 'full', $language),
                    'end_date' => $this->dateService->formatDate($req->end_date, $calendarPreference, 'full', $language),
                    'status' => ucfirst($req->status),
                    'reason' => $req->reason ?? '—',
                ];
            }
        }

        // Add date range to title if available
        if ($dateRangeText) {
            $title .= " ({$dateRangeText})";
        }

        // Prepare parameters
        $parameters = [
            'date_range' => $dateRangeText,
            'total_count' => count($rows),
        ];

        // Add totals for Excel reports
        if (isset($totals) && $validated['report_type'] === 'excel') {
            $parameters['show_totals'] = true;
            $parameters['totals_row'] = $totals;
        }

        // Create report config
        $config = ReportConfig::fromArray([
            'report_key' => "leave_requests_{$reportVariant}",
            'report_type' => $validated['report_type'],
            'branding_id' => $validated['branding_id'] ?? $currentSchoolId,
            'title' => $title,
            'calendar_preference' => $calendarPreference,
            'language' => $language,
            'parameters' => $parameters,
        ]);

        // Generate report
        try {
            $reportRun = $this->reportService->generateReport(
                $config,
                ['columns' => $columns, 'rows' => $rows],
                $profile->organization_id
            );

            return response()->json([
                'success' => true,
                'report_id' => $reportRun->id,
                'status' => $reportRun->status,
                'download_url' => $reportRun->isCompleted()
                    ? url("/api/reports/{$reportRun->id}/download")
                    : null,
                'file_name' => $reportRun->file_name,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to generate leave report', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Failed to generate report: ' . $e->getMessage(),
            ], 500);
        }
    }
}
