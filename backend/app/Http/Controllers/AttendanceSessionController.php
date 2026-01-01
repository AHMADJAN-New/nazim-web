<?php

namespace App\Http\Controllers;

use App\Http\Requests\AttendanceScanRequest;
use App\Http\Requests\MarkAttendanceRecordsRequest;
use App\Http\Requests\StoreAttendanceSessionRequest;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\ClassModel;
use App\Services\Notifications\NotificationService;
use App\Services\Reports\DateConversionService;
use App\Services\Reports\ReportConfig;
use App\Services\Reports\ReportService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class AttendanceSessionController extends Controller
{
    public function __construct(
        private ReportService $reportService,
        private DateConversionService $dateService,
        private NotificationService $notificationService
    ) {}
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('attendance_sessions.read')) {
                return response()->json(['error' => 'Access Denied'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for attendance_sessions.read: ' . $e->getMessage());
            return response()->json(['error' => 'Access Denied'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $query = AttendanceSession::with(['classModel', 'classes', 'school'])
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at');

        if ($request->filled('class_id')) {
            $query->where('class_id', $request->input('class_id'));
        }

        if ($request->filled('method')) {
            $query->where('method', $request->input('method'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('session_date', '>=', Carbon::parse($request->input('date_from'))->toDateString());
        }

        if ($request->filled('date_to')) {
            $query->whereDate('session_date', '<=', Carbon::parse($request->input('date_to'))->toDateString());
        }

        // Sort by latest first (session_date desc, then created_at desc)
        $query->orderBy('session_date', 'desc')
              ->orderBy('created_at', 'desc');

        $perPage = $request->integer('per_page', 25);
        $allowedPerPage = [10, 25, 50, 100];
        if (!in_array($perPage, $allowedPerPage, true)) {
            $perPage = 25;
        }

        $sessions = $query->paginate($perPage);

        return response()->json($sessions);
    }

    public function store(StoreAttendanceSessionRequest $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('attendance_sessions.create')) {
                return response()->json(['error' => 'Access Denied'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for attendance_sessions.create: ' . $e->getMessage());
            return response()->json(['error' => 'Access Denied'], 403);
        }

        $validated = $request->validated();
        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Determine class IDs: use class_ids array if provided, otherwise use class_id (backward compatibility)
        $classIds = !empty($validated['class_ids']) ? $validated['class_ids'] : 
                    (!empty($validated['class_id']) ? [$validated['class_id']] : []);

        if (empty($classIds)) {
            return response()->json(['error' => 'At least one class is required'], 422);
        }

        // Validate all classes belong to the organization
        $classes = ClassModel::whereIn('id', $classIds)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->get();

        if ($classes->count() !== count($classIds)) {
            return response()->json(['error' => 'One or more classes not found for this school'], 404);
        }

        // Use first class_id for backward compatibility (can be null if using only class_ids)
        $primaryClassId = $classIds[0] ?? null;

        $session = DB::transaction(function () use ($validated, $profile, $user, $primaryClassId, $classIds, $currentSchoolId) {
            $session = AttendanceSession::create([
                'organization_id' => $profile->organization_id,
                'school_id' => $currentSchoolId,
                'class_id' => $primaryClassId, // Keep for backward compatibility
                'academic_year_id' => $validated['academic_year_id'] ?? null,
                'session_date' => Carbon::parse($validated['session_date'])->toDateString(),
                'method' => $validated['method'],
                'status' => $validated['status'] ?? 'open',
                'remarks' => $validated['remarks'] ?? null,
                'created_by' => $user->id,
            ]);

            // Attach all classes via pivot table
            $pivot = [
                'organization_id' => $profile->organization_id,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            if (Schema::hasColumn('attendance_session_classes', 'school_id')) {
                $pivot['school_id'] = $currentSchoolId;
            }
            $session->classes()->attach($classIds, $pivot);

            if (!empty($validated['records'])) {
                foreach ($validated['records'] as $record) {
                    AttendanceRecord::create([
                        'attendance_session_id' => $session->id,
                        'organization_id' => $profile->organization_id,
                        'school_id' => $currentSchoolId,
                        'student_id' => $record['student_id'],
                        'status' => $record['status'],
                        'entry_method' => $validated['method'],
                        'marked_at' => now(),
                        'marked_by' => $user->id,
                        'note' => $record['note'] ?? null,
                    ]);
                }
            }

            return $session->load(['classModel', 'classes', 'school', 'records']);
        });

        // Load relationships for notification
        $session->load(['classModel', 'classes', 'school', 'academicYear']);

        // Notify about attendance session creation
        try {
            $classNames = $session->classes->pluck('name')->join(', ') ?: ($session->classModel?->name ?? 'Class');
            $sessionDate = $session->session_date ? Carbon::parse($session->session_date)->format('Y-m-d') : 'N/A';
            $method = ucfirst($session->method ?? 'manual');
            
            $this->notificationService->notify(
                'attendance.session.created',
                $session,
                $user,
                [
                    'title' => '📋 Attendance Session Created',
                    'body' => "New attendance session created for {$classNames} on {$sessionDate} using {$method} method.",
                    'url' => "/attendance/sessions/{$session->id}",
                ]
            );
        } catch (\Exception $e) {
            Log::warning('Failed to send attendance session creation notification', [
                'session_id' => $session->id,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json($session, 201);
    }

    public function show(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('attendance_sessions.read')) {
                return response()->json(['error' => 'Access Denied'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for attendance_sessions.read: ' . $e->getMessage());
            return response()->json(['error' => 'Access Denied'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId(request());
        $session = AttendanceSession::with([
            'classModel',
            'classes', // Load all classes for multi-class sessions
            'school',
            'records.student',
        ])->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$session) {
            return response()->json(['error' => 'Attendance session not found'], 404);
        }

        return response()->json($session);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('attendance_sessions.update')) {
                return response()->json(['error' => 'Access Denied'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for attendance_sessions.update: ' . $e->getMessage());
            return response()->json(['error' => 'Access Denied'], 403);
        }

        $validated = $request->validate([
            'status' => 'nullable|string|in:open,closed',
            'remarks' => 'nullable|string',
        ]);

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $session = AttendanceSession::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$session) {
            return response()->json(['error' => 'Attendance session not found'], 404);
        }

        // Track old status for status change notification
        $oldStatus = $session->status;
        
        $session->update([
            'status' => $validated['status'] ?? $session->status,
            'remarks' => $validated['remarks'] ?? $session->remarks,
            'closed_at' => ($validated['status'] ?? $session->status) === 'closed' ? now() : null,
        ]);

        $session->fresh(['classModel', 'classes', 'school', 'academicYear']);

        // Notify if session is closed
        try {
            if (isset($validated['status']) && $validated['status'] === 'closed' && $oldStatus !== 'closed') {
                $classNames = $session->classes->pluck('name')->join(', ') ?: ($session->classModel?->name ?? 'Class');
                $sessionDate = $session->session_date ? Carbon::parse($session->session_date)->format('Y-m-d') : 'N/A';
                $recordsCount = $session->records()->whereNull('deleted_at')->count();
                
                $this->notificationService->notify(
                    'attendance.session.closed',
                    $session,
                    $user,
                    [
                        'title' => '✅ Attendance Session Closed',
                        'body' => "Attendance session for {$classNames} on {$sessionDate} has been closed. {$recordsCount} record(s) marked.",
                        'url' => "/attendance/sessions/{$session->id}",
                    ]
                );
            }
        } catch (\Exception $e) {
            Log::warning('Failed to send attendance session closed notification', [
                'session_id' => $session->id,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json($session);
    }

    public function close(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('attendance_sessions.update')) {
                return response()->json(['error' => 'Access Denied'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for attendance_sessions.update: ' . $e->getMessage());
            return response()->json(['error' => 'Access Denied'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId(request());

        $session = AttendanceSession::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$session) {
            return response()->json(['error' => 'Attendance session not found'], 404);
        }

        if ($session->status === 'closed') {
            return response()->json(['error' => 'Session is already closed'], 422);
        }

        $session->update([
            'status' => 'closed',
            'closed_at' => now(),
        ]);

        // Load relationships for notification
        $session->fresh(['classModel', 'classes', 'school', 'academicYear', 'records']);

        // Notify about attendance session closure
        try {
            $classNames = $session->classes->pluck('name')->join(', ') ?: ($session->classModel?->name ?? 'Class');
            $sessionDate = $session->session_date ? Carbon::parse($session->session_date)->format('Y-m-d') : 'N/A';
            $recordsCount = $session->records()->whereNull('deleted_at')->count();
            
            $this->notificationService->notify(
                'attendance.session.closed',
                $session,
                $user,
                [
                    'title' => '✅ Attendance Session Closed',
                    'body' => "Attendance session for {$classNames} on {$sessionDate} has been closed. {$recordsCount} record(s) marked.",
                    'url' => "/attendance/sessions/{$session->id}",
                ]
            );
        } catch (\Exception $e) {
            Log::warning('Failed to send attendance session closed notification', [
                'session_id' => $session->id,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json($session);
    }

    public function markRecords(MarkAttendanceRecordsRequest $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('attendance_sessions.update')) {
                return response()->json(['error' => 'Access Denied'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for attendance_sessions.update: ' . $e->getMessage());
            return response()->json(['error' => 'Access Denied'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $session = AttendanceSession::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$session) {
            return response()->json(['error' => 'Attendance session not found'], 404);
        }

        $records = $request->validated('records');
        $studentIds = collect($records)->pluck('student_id')->unique()->values();

        $enrolled = DB::table('student_admissions')
            ->whereIn('student_id', $studentIds)
            ->where('class_id', $session->class_id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->pluck('student_id')
            ->toArray();

        $invalid = $studentIds->diff($enrolled);
        if ($invalid->isNotEmpty()) {
            return response()->json([
                'error' => 'Some students are not enrolled in this class for the organization',
                'invalid_student_ids' => $invalid->values(),
            ], 422);
        }

        $timestamp = now();

        DB::transaction(function () use ($records, $session, $profile, $user, $timestamp) {
            $chunks = collect($records)->chunk(500);

            foreach ($chunks as $chunk) {
                $payload = $chunk->map(function ($record) use ($session, $profile, $user, $timestamp) {
                    return [
                        'id' => (string) Str::uuid(),
                        'attendance_session_id' => $session->id,
                        'organization_id' => $profile->organization_id,
                        'school_id' => $session->school_id,
                        'student_id' => $record['student_id'],
                        'status' => $record['status'],
                        'entry_method' => $session->method,
                        'marked_at' => $timestamp,
                        'marked_by' => $user->id,
                        'note' => $record['note'] ?? null,
                        'deleted_at' => null,
                        'created_at' => $timestamp,
                        'updated_at' => $timestamp,
                    ];
                })->toArray();

                DB::table('attendance_records')->upsert(
                    $payload,
                    ['attendance_session_id', 'student_id', 'deleted_at'],
                    ['status', 'entry_method', 'marked_at', 'marked_by', 'note', 'updated_at']
                );
            }
        });

        $session->refresh();
        return response()->json($session->load(['records.student', 'classModel', 'school']));
    }

    public function scan(AttendanceScanRequest $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('attendance_sessions.update')) {
                return response()->json(['error' => 'Access Denied'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for attendance_sessions.update: ' . $e->getMessage());
            return response()->json(['error' => 'Access Denied'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $session = AttendanceSession::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$session) {
            return response()->json(['error' => 'Attendance session not found'], 404);
        }

        if ($session->status === 'closed') {
            return response()->json(['error' => 'Cannot mark attendance for a closed session'], 422);
        }

        $validated = $request->validated();
        $searchTerm = trim($validated['card_number']);

        // Search by card_number, admission_no, or student_code
        $student = DB::table('students')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->where(function ($q) use ($searchTerm) {
                $q->where('card_number', $searchTerm)
                  ->orWhere('admission_no', $searchTerm)
                  ->orWhere('student_code', $searchTerm);
            })
            ->first();

        if (!$student) {
            return response()->json(['error' => 'Student not found for this organization'], 404);
        }

        $isEnrolled = DB::table('student_admissions')
            ->where('student_id', $student->id)
            ->where('class_id', $session->class_id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->exists();

        if (!$isEnrolled) {
            return response()->json(['error' => 'Student is not enrolled in this class'], 422);
        }

        $record = AttendanceRecord::updateOrCreate(
            [
                'attendance_session_id' => $session->id,
                'student_id' => $student->id,
            ],
            [
                'organization_id' => $profile->organization_id,
                'school_id' => $session->school_id,
                'status' => $validated['status'] ?? 'present',
                'entry_method' => 'barcode',
                'marked_at' => now(),
                'marked_by' => $user->id,
                'note' => $validated['note'] ?? null,
            ]
        );

        // Refresh and load student relationship
        $record->refresh();
        $record->load('student:id,full_name,admission_no,card_number,student_code');

        return response()->json($record);
    }

    public function scanFeed(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('attendance_sessions.read')) {
                return response()->json(['error' => 'Access Denied'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for attendance_sessions.read: ' . $e->getMessage());
            return response()->json(['error' => 'Access Denied'], 403);
        }

        $limit = (int) $request->integer('limit', 25);
        $limit = $limit > 100 ? 100 : $limit;

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $session = AttendanceSession::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$session) {
            return response()->json(['error' => 'Attendance session not found'], 404);
        }

        $records = AttendanceRecord::with('student')
            ->where('attendance_session_id', $session->id)
            ->orderByDesc('marked_at')
            ->limit($limit)
            ->get();

        return response()->json($records);
    }

    public function roster(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('attendance_sessions.read')) {
                return response()->json(['error' => 'Access Denied'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for attendance_sessions.read: ' . $e->getMessage());
            return response()->json(['error' => 'Access Denied'], 403);
        }

        $request->validate([
            'class_id' => 'nullable|uuid|exists:classes,id', // Keep for backward compatibility
            'class_ids' => 'nullable|array|min:1', // New: multiple classes
            'class_ids.*' => 'required|uuid|exists:classes,id',
            'academic_year_id' => 'nullable|uuid|exists:academic_years,id',
        ]);

        // Determine class IDs: use class_ids array if provided, otherwise use class_id
        $classIds = !empty($request->input('class_ids')) ? $request->input('class_ids') : 
                    (!empty($request->input('class_id')) ? [$request->input('class_id')] : []);

        if (empty($classIds)) {
            return response()->json(['error' => 'At least one class is required'], 422);
        }

        // Validate all classes belong to the organization
        $classes = ClassModel::whereIn('id', $classIds)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $this->getCurrentSchoolId($request))
            ->whereNull('deleted_at')
            ->get();

        if ($classes->count() !== count($classIds)) {
            return response()->json(['error' => 'One or more classes not found for this organization'], 404);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Get students from all classes
        $students = DB::table('student_admissions as sa')
            ->join('students as s', 'sa.student_id', '=', 's.id')
            ->whereIn('sa.class_id', $classIds)
            ->where('sa.organization_id', $profile->organization_id)
            ->where('sa.school_id', $currentSchoolId)
            ->when($request->filled('academic_year_id'), function ($q) use ($request) {
                $q->where('sa.academic_year_id', $request->input('academic_year_id'));
            })
            ->whereNull('sa.deleted_at')
            ->whereNull('s.deleted_at')
            ->select(
                's.id',
                's.full_name',
                's.admission_no',
                's.card_number',
                's.student_code',
                's.gender',
                'sa.school_id',
                'sa.class_id',
                'sa.academic_year_id'
            )
            ->orderBy('s.full_name')
            ->get();

        return response()->json($students);
    }

    public function report(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('attendance_sessions.read')) {
                return response()->json(['error' => 'Access Denied'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for attendance_sessions.read: ' . $e->getMessage());
            return response()->json(['error' => 'Access Denied'], 403);
        }

        $request->validate([
            'student_id' => 'nullable|uuid|exists:students,id',
            'class_id' => 'nullable|uuid|exists:classes,id',
            'class_ids' => 'nullable|array|min:1',
            'class_ids.*' => 'required|uuid|exists:classes,id',
            'academic_year_id' => 'nullable|uuid|exists:academic_years,id',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'status' => 'nullable|string|in:present,absent,late,excused,sick,leave',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $query = AttendanceRecord::with(['student:id,full_name,admission_no,card_number,student_code', 'session.classModel', 'session.classes', 'session.school'])
            ->where('attendance_records.organization_id', $profile->organization_id)
            ->where('attendance_records.school_id', $currentSchoolId)
            ->whereNull('attendance_records.deleted_at')
            ->whereHas('session', function ($q) {
                $q->whereNull('deleted_at');
            });

        if ($request->filled('student_id')) {
            $query->where('attendance_records.student_id', $request->input('student_id'));
        }

        if ($request->filled('class_id')) {
            $query->whereHas('session', function ($q) use ($request) {
                $q->where('class_id', $request->input('class_id'));
            });
        }

        if ($request->filled('class_ids')) {
            $classIds = $request->input('class_ids');
            $query->whereHas('session', function ($q) use ($classIds) {
                $q->whereHas('classes', function ($cq) use ($classIds) {
                    $cq->whereIn('classes.id', $classIds);
                })->orWhereIn('class_id', $classIds);
            });
        }

        if ($request->filled('academic_year_id')) {
            $query->whereHas('session', function ($q) use ($request) {
                $q->where('academic_year_id', $request->input('academic_year_id'));
            });
        }

        if ($request->filled('date_from')) {
            $query->whereHas('session', function ($q) use ($request) {
                $q->whereDate('session_date', '>=', Carbon::parse($request->input('date_from'))->toDateString());
            });
        }

        if ($request->filled('date_to')) {
            $query->whereHas('session', function ($q) use ($request) {
                $q->whereDate('session_date', '<=', Carbon::parse($request->input('date_to'))->toDateString());
            });
        }

        if ($request->filled('status')) {
            $query->where('attendance_records.status', $request->input('status'));
        }

        $perPage = $request->integer('per_page', 25);
        $allowedPerPage = [10, 25, 50, 100];
        if (!in_array($perPage, $allowedPerPage, true)) {
            $perPage = 25;
        }

        $records = $query->orderBy('marked_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $request->input('page', 1));

        return response()->json($records);
    }

    private function buildEmptyTotalsReport(): array
    {
        return [
            'totals' => [
                'sessions' => 0,
                'students_marked' => 0,
                'present' => 0,
                'absent' => 0,
                'late' => 0,
                'excused' => 0,
                'sick' => 0,
                'leave' => 0,
                'attendance_rate' => 0,
            ],
            'status_breakdown' => [],
            'class_breakdown' => [],
            'school_breakdown' => [],
            'recent_sessions' => [],
        ];
    }

    public function totalsReport(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('attendance_sessions.report') && !$user->hasPermissionTo('attendance_sessions.read')) {
                return response()->json(['error' => 'Access Denied'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for attendance_sessions.report: ' . $e->getMessage());
            return response()->json(['error' => 'Access Denied'], 403);
        }

        $validated = $request->validate([
            'class_id' => 'nullable|uuid|exists:classes,id',
            'class_ids' => 'nullable|array|min:1',
            'class_ids.*' => 'required|uuid|exists:classes,id',
            'academic_year_id' => 'nullable|uuid|exists:academic_years,id',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'status' => 'nullable|string|in:present,absent,late,excused,sick,leave',
        ]);

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $classIds = [];
        if (!empty($validated['class_ids'])) {
            $classIds = $validated['class_ids'];
        }

        if (!empty($validated['class_id'])) {
            $classIds[] = $validated['class_id'];
        }

        if (!empty($classIds)) {
            $classIds = array_unique($classIds);
            $validClassCount = DB::table('classes')
                ->whereIn('id', $classIds)
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->count();

            if ($validClassCount !== count($classIds)) {
                return response()->json(['error' => 'One or more classes not found for this school'], 404);
            }
        }

        $recordQuery = AttendanceRecord::query()
            ->join('attendance_sessions as s', 's.id', '=', 'attendance_records.attendance_session_id')
            ->where('attendance_records.organization_id', $profile->organization_id)
            ->where('attendance_records.school_id', $currentSchoolId)
            ->whereNull('attendance_records.deleted_at')
            ->whereNull('s.deleted_at')
            ->where('s.school_id', $currentSchoolId);

        $sessionQuery = AttendanceSession::query()
            ->where('attendance_sessions.organization_id', $profile->organization_id)
            ->whereNull('attendance_sessions.deleted_at')
            ->where('attendance_sessions.school_id', $currentSchoolId);

        if ($request->filled('academic_year_id')) {
            $recordQuery->where('s.academic_year_id', $request->input('academic_year_id'));
            $sessionQuery->where('attendance_sessions.academic_year_id', $request->input('academic_year_id'));
        }

        if (!empty($classIds)) {
            $recordQuery->where(function ($q) use ($classIds) {
                $q->whereIn('s.class_id', $classIds)
                    ->orWhereExists(function ($sub) use ($classIds) {
                        $sub->select(DB::raw(1))
                            ->from('attendance_session_classes as asc')
                            ->whereNull('asc.deleted_at')
                            ->whereColumn('asc.attendance_session_id', 's.id')
                            ->whereIn('asc.class_id', $classIds);
                    });
            });

            $sessionQuery->where(function ($q) use ($classIds) {
                $q->whereIn('attendance_sessions.class_id', $classIds)
                    ->orWhereExists(function ($sub) use ($classIds) {
                        $sub->select(DB::raw(1))
                            ->from('attendance_session_classes as asc')
                            ->whereNull('asc.deleted_at')
                            ->whereColumn('asc.attendance_session_id', 'attendance_sessions.id')
                            ->whereIn('asc.class_id', $classIds);
                    });
            });
        }

        if ($request->filled('date_from')) {
            $recordQuery->whereDate('s.session_date', '>=', Carbon::parse($request->input('date_from'))->toDateString());
            $sessionQuery->whereDate('attendance_sessions.session_date', '>=', Carbon::parse($request->input('date_from'))->toDateString());
        }

        if ($request->filled('date_to')) {
            $recordQuery->whereDate('s.session_date', '<=', Carbon::parse($request->input('date_to'))->toDateString());
            $sessionQuery->whereDate('attendance_sessions.session_date', '<=', Carbon::parse($request->input('date_to'))->toDateString());
        }

        if ($request->filled('status')) {
            $recordQuery->where('attendance_records.status', $request->input('status'));
        }

        $recordTotals = (clone $recordQuery)
            ->selectRaw('COUNT(*) as total_records')
            ->selectRaw("SUM(CASE WHEN attendance_records.status = 'present' THEN 1 ELSE 0 END) as present_count")
            ->selectRaw("SUM(CASE WHEN attendance_records.status = 'absent' THEN 1 ELSE 0 END) as absent_count")
            ->selectRaw("SUM(CASE WHEN attendance_records.status = 'late' THEN 1 ELSE 0 END) as late_count")
            ->selectRaw("SUM(CASE WHEN attendance_records.status = 'excused' THEN 1 ELSE 0 END) as excused_count")
            ->selectRaw("SUM(CASE WHEN attendance_records.status = 'sick' THEN 1 ELSE 0 END) as sick_count")
            ->selectRaw("SUM(CASE WHEN attendance_records.status = 'leave' THEN 1 ELSE 0 END) as leave_count")
            ->first();

        $totalRecords = (int) ($recordTotals->total_records ?? 0);
        $presentCount = (int) ($recordTotals->present_count ?? 0);
        $absentCount = (int) ($recordTotals->absent_count ?? 0);
        $lateCount = (int) ($recordTotals->late_count ?? 0);
        $excusedCount = (int) ($recordTotals->excused_count ?? 0);
        $sickCount = (int) ($recordTotals->sick_count ?? 0);
        $leaveCount = (int) ($recordTotals->leave_count ?? 0);

        $sessionsCount = (clone $sessionQuery)->count();
        $uniqueStudents = (clone $recordQuery)->distinct('attendance_records.student_id')->count('attendance_records.student_id');

        $statusBreakdown = (clone $recordQuery)
            ->select('attendance_records.status', DB::raw('COUNT(*) as total'))
            ->groupBy('attendance_records.status')
            ->orderByDesc('total')
            ->get();

        $classBreakdown = (clone $recordQuery)
            ->leftJoin('attendance_session_classes as asc', 'asc.attendance_session_id', '=', 'attendance_records.attendance_session_id')
            ->leftJoin('classes as pivot_class', 'pivot_class.id', '=', 'asc.class_id')
            ->leftJoin('classes as primary_class', 'primary_class.id', '=', 's.class_id')
            ->leftJoin('school_branding as sb', 'sb.id', '=', 's.school_id')
            ->selectRaw('COALESCE(pivot_class.id, primary_class.id) as class_id')
            ->selectRaw("COALESCE(pivot_class.name, primary_class.name, 'Unassigned') as class_name")
            ->selectRaw("COALESCE(sb.school_name, 'No school') as school_name")
            ->selectRaw('COUNT(*) as total_records')
            ->selectRaw("SUM(CASE WHEN attendance_records.status = 'present' THEN 1 ELSE 0 END) as present_count")
            ->selectRaw("SUM(CASE WHEN attendance_records.status = 'absent' THEN 1 ELSE 0 END) as absent_count")
            ->selectRaw("SUM(CASE WHEN attendance_records.status = 'late' THEN 1 ELSE 0 END) as late_count")
            ->selectRaw("SUM(CASE WHEN attendance_records.status = 'excused' THEN 1 ELSE 0 END) as excused_count")
            ->selectRaw("SUM(CASE WHEN attendance_records.status = 'sick' THEN 1 ELSE 0 END) as sick_count")
            ->selectRaw("SUM(CASE WHEN attendance_records.status = 'leave' THEN 1 ELSE 0 END) as leave_count")
            ->groupBy(DB::raw('COALESCE(pivot_class.id, primary_class.id)'), DB::raw("COALESCE(pivot_class.name, primary_class.name, 'Unassigned')"), DB::raw("COALESCE(sb.school_name, 'No school')"))
            ->orderByDesc('total_records')
            ->get();

        $schoolBreakdown = (clone $recordQuery)
            ->leftJoin('school_branding as sb', 'sb.id', '=', 's.school_id')
            ->selectRaw('COALESCE(sb.id, s.school_id) as school_id')
            ->selectRaw("COALESCE(sb.school_name, 'No school') as school_name")
            ->selectRaw('COUNT(*) as total_records')
            ->selectRaw("SUM(CASE WHEN attendance_records.status = 'present' THEN 1 ELSE 0 END) as present_count")
            ->selectRaw("SUM(CASE WHEN attendance_records.status = 'absent' THEN 1 ELSE 0 END) as absent_count")
            ->selectRaw("SUM(CASE WHEN attendance_records.status = 'late' THEN 1 ELSE 0 END) as late_count")
            ->selectRaw("SUM(CASE WHEN attendance_records.status = 'excused' THEN 1 ELSE 0 END) as excused_count")
            ->selectRaw("SUM(CASE WHEN attendance_records.status = 'sick' THEN 1 ELSE 0 END) as sick_count")
            ->selectRaw("SUM(CASE WHEN attendance_records.status = 'leave' THEN 1 ELSE 0 END) as leave_count")
            ->groupBy(DB::raw('COALESCE(sb.id, s.school_id)'), DB::raw("COALESCE(sb.school_name, 'No school')"))
            ->orderByDesc('total_records')
            ->get();

        $sessionStats = (clone $recordQuery)
            ->select('attendance_records.attendance_session_id')
            ->selectRaw('COUNT(*) as total_records')
            ->selectRaw("SUM(CASE WHEN attendance_records.status = 'present' THEN 1 ELSE 0 END) as present_count")
            ->selectRaw("SUM(CASE WHEN attendance_records.status = 'absent' THEN 1 ELSE 0 END) as absent_count")
            ->selectRaw("SUM(CASE WHEN attendance_records.status = 'late' THEN 1 ELSE 0 END) as late_count")
            ->selectRaw("SUM(CASE WHEN attendance_records.status = 'excused' THEN 1 ELSE 0 END) as excused_count")
            ->selectRaw("SUM(CASE WHEN attendance_records.status = 'sick' THEN 1 ELSE 0 END) as sick_count")
            ->selectRaw("SUM(CASE WHEN attendance_records.status = 'leave' THEN 1 ELSE 0 END) as leave_count")
            ->groupBy('attendance_records.attendance_session_id')
            ->get()
            ->keyBy('attendance_session_id');

        $recentSessions = (clone $sessionQuery)
            ->with(['classes:id,name', 'school:id,school_name'])
            ->orderBy('attendance_sessions.session_date', 'desc')
            ->orderBy('attendance_sessions.created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($session) use ($sessionStats) {
                $stats = $sessionStats->get($session->id);

                return [
                    'id' => $session->id,
                    'session_date' => optional($session->session_date)->toDateString(),
                    'status' => $session->status,
                    'class_name' => $session->classModel?->name ?? ($session->classes->first()?->name ?? '—'),
                    'school_name' => $session->school?->school_name ?? null,
                    'totals' => [
                        'records' => (int) ($stats->total_records ?? 0),
                        'present' => (int) ($stats->present_count ?? 0),
                        'absent' => (int) ($stats->absent_count ?? 0),
                        'late' => (int) ($stats->late_count ?? 0),
                        'excused' => (int) ($stats->excused_count ?? 0),
                        'sick' => (int) ($stats->sick_count ?? 0),
                        'leave' => (int) ($stats->leave_count ?? 0),
                    ],
                ];
            })->values();

        $attendanceRate = $totalRecords > 0 ? round(($presentCount / $totalRecords) * 100, 1) : 0;

        $report = [
            'totals' => [
                'sessions' => $sessionsCount,
                'students_marked' => $uniqueStudents,
                'present' => $presentCount,
                'absent' => $absentCount,
                'late' => $lateCount,
                'excused' => $excusedCount,
                'sick' => $sickCount,
                'leave' => $leaveCount,
                'attendance_rate' => $attendanceRate,
            ],
            'status_breakdown' => $statusBreakdown,
            'class_breakdown' => $classBreakdown,
            'school_breakdown' => $schoolBreakdown,
            'recent_sessions' => $recentSessions,
        ];

        return response()->json($report);
    }

    /**
     * Generate attendance report
     * 
     * POST /api/attendance-sessions/generate-report
     */
    public function generateReport(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('attendance_sessions.read')) {
                return response()->json(['error' => 'Access Denied'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for attendance_sessions.read: ' . $e->getMessage());
            return response()->json(['error' => 'Access Denied'], 403);
        }

        $validated = $request->validate([
            'report_type' => 'required|in:pdf,excel',
            'report_variant' => 'required|in:daily,totals,room_wise,class_wise',
            'branding_id' => 'nullable|uuid',
            'calendar_preference' => 'nullable|in:gregorian,jalali,qamari',
            'language' => 'nullable|in:en,ps,fa,ar',
            'student_id' => 'nullable|uuid',
            'class_id' => 'nullable|uuid',
            'school_id' => 'nullable|uuid',
            'status' => 'nullable|in:present,absent,late,excused,sick,leave',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'academic_year_id' => 'nullable|uuid',
        ]);

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $calendarPreference = $validated['calendar_preference'] ?? 'jalali';
        $language = $validated['language'] ?? 'ps';

        // Build query based on filters
        $query = AttendanceRecord::with(['student', 'session.classModel', 'session.classes', 'session.school'])
            ->where('attendance_records.organization_id', $profile->organization_id)
            ->where('attendance_records.school_id', $currentSchoolId)
            ->whereNull('attendance_records.deleted_at')
            ->whereHas('session', function ($q) {
                $q->whereNull('deleted_at');
            });

        // Apply filters
        if (!empty($validated['student_id'])) {
            $query->where('attendance_records.student_id', $validated['student_id']);
        }
        if (!empty($validated['class_id'])) {
            $query->whereHas('session', function ($q) use ($validated) {
                $q->where('class_id', $validated['class_id']);
            });
        }
        if (!empty($validated['status'])) {
            $query->where('attendance_records.status', $validated['status']);
        }
        if (!empty($validated['date_from'])) {
            $query->whereHas('session', function ($q) use ($validated) {
                $q->whereDate('session_date', '>=', Carbon::parse($validated['date_from'])->toDateString());
            });
        }
        if (!empty($validated['date_to'])) {
            $query->whereHas('session', function ($q) use ($validated) {
                $q->whereDate('session_date', '<=', Carbon::parse($validated['date_to'])->toDateString());
            });
        }
        if (!empty($validated['academic_year_id'])) {
            $query->whereHas('session', function ($q) use ($validated) {
                $q->where('academic_year_id', $validated['academic_year_id']);
            });
        }

        $records = $query->orderBy('marked_at', 'desc')->get();

        // Prepare report data based on variant
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

        $reportVariant = $validated['report_variant'];

        if ($reportVariant === 'daily') {
            // Daily attendance report
            $title = 'Daily Attendance Report';
            $columns = [
                ['key' => 'student_name', 'label' => 'Student'],
                ['key' => 'admission_no', 'label' => 'Admission No'],
                ['key' => 'class_name', 'label' => 'Class'],
                ['key' => 'session_date', 'label' => 'Date'],
                ['key' => 'status', 'label' => 'Status'],
                ['key' => 'marked_at', 'label' => 'Marked At'],
                ['key' => 'entry_method', 'label' => 'Method'],
            ];

            foreach ($records as $record) {
                $rows[] = [
                    'student_name' => $record->student?->full_name ?? '—',
                    'admission_no' => $record->student?->admission_no ?? '—',
                    'class_name' => $record->session?->classModel?->name ?? ($record->session?->classes?->first()?->name ?? '—'),
                    'session_date' => $record->session?->session_date 
                        ? $this->dateService->formatDate($record->session->session_date, $calendarPreference, 'full', $language)
                        : '—',
                    'status' => ucfirst($record->status),
                    'marked_at' => $this->dateService->formatDate($record->marked_at, $calendarPreference, 'full', $language) . ' ' . Carbon::parse($record->marked_at)->format('H:i'),
                    'entry_method' => ucfirst($record->entry_method ?? '—'),
                ];
            }
        } elseif ($reportVariant === 'totals') {
            // Attendance totals report
            $title = 'Attendance Totals Report';
            $columns = [
                ['key' => 'class_name', 'label' => 'Class', 'type' => 'text'],
                ['key' => 'school_name', 'label' => 'School', 'type' => 'text'],
                ['key' => 'present', 'label' => 'Present', 'type' => 'numeric'],
                ['key' => 'absent', 'label' => 'Absent', 'type' => 'numeric'],
                ['key' => 'late', 'label' => 'Late', 'type' => 'numeric'],
                ['key' => 'excused', 'label' => 'Excused', 'type' => 'numeric'],
                ['key' => 'sick', 'label' => 'Sick', 'type' => 'numeric'],
                ['key' => 'leave', 'label' => 'Leave', 'type' => 'numeric'],
                ['key' => 'total', 'label' => 'Total', 'type' => 'numeric'],
                ['key' => 'attendance_rate', 'label' => 'Attendance Rate %', 'type' => 'numeric'],
            ];

            // Group by class
            $grouped = $records->groupBy(function ($record) {
                return $record->session?->classModel?->id ?? ($record->session?->classes?->first()?->id ?? 'unassigned');
            });

            foreach ($grouped as $classId => $classRecords) {
                $firstRecord = $classRecords->first();
                $present = $classRecords->where('status', 'present')->count();
                $absent = $classRecords->where('status', 'absent')->count();
                $late = $classRecords->where('status', 'late')->count();
                $excused = $classRecords->where('status', 'excused')->count();
                $sick = $classRecords->where('status', 'sick')->count();
                $leave = $classRecords->where('status', 'leave')->count();
                $total = $classRecords->count();
                $attendanceRate = $total > 0 ? round(($present / $total) * 100, 1) : 0;

                $rows[] = [
                    'class_name' => $firstRecord->session?->classModel?->name ?? ($firstRecord->session?->classes?->first()?->name ?? 'Unassigned'),
                    'school_name' => $firstRecord->session?->school?->school_name ?? '—',
                    'present' => $present,
                    'absent' => $absent,
                    'late' => $late,
                    'excused' => $excused,
                    'sick' => $sick,
                    'leave' => $leave,
                    'total' => $total,
                    'attendance_rate' => $attendanceRate,
                ];
            }

            // Add totals row for Excel
            if (count($rows) > 0) {
                $totals = [
                    'class_name' => 'TOTAL',
                    'school_name' => '',
                    'present' => array_sum(array_column($rows, 'present')),
                    'absent' => array_sum(array_column($rows, 'absent')),
                    'late' => array_sum(array_column($rows, 'late')),
                    'excused' => array_sum(array_column($rows, 'excused')),
                    'sick' => array_sum(array_column($rows, 'sick')),
                    'leave' => array_sum(array_column($rows, 'leave')),
                    'total' => array_sum(array_column($rows, 'total')),
                    'attendance_rate' => count($rows) > 0 ? round(array_sum(array_column($rows, 'present')) / array_sum(array_column($rows, 'total')) * 100, 1) : 0,
                ];
            }
        } elseif ($reportVariant === 'class_wise') {
            // Class-wise summary
            $title = 'Attendance Class-wise Summary';
            $columns = [
                ['key' => 'class_name', 'label' => 'Class', 'type' => 'text'],
                ['key' => 'school_name', 'label' => 'School', 'type' => 'text'],
                ['key' => 'total_sessions', 'label' => 'Sessions', 'type' => 'numeric'],
                ['key' => 'total_records', 'label' => 'Records', 'type' => 'numeric'],
                ['key' => 'present', 'label' => 'Present', 'type' => 'numeric'],
                ['key' => 'absent', 'label' => 'Absent', 'type' => 'numeric'],
                ['key' => 'attendance_rate', 'label' => 'Attendance Rate %', 'type' => 'numeric'],
            ];

            $grouped = $records->groupBy(function ($record) {
                return $record->session?->classModel?->id ?? ($record->session?->classes?->first()?->id ?? 'unassigned');
            });

            foreach ($grouped as $classId => $classRecords) {
                $firstRecord = $classRecords->first();
                $sessions = $classRecords->pluck('attendance_session_id')->unique()->count();
                $present = $classRecords->where('status', 'present')->count();
                $absent = $classRecords->where('status', 'absent')->count();
                $total = $classRecords->count();
                $attendanceRate = $total > 0 ? round(($present / $total) * 100, 1) : 0;

                $rows[] = [
                    'class_name' => $firstRecord->session?->classModel?->name ?? ($firstRecord->session?->classes?->first()?->name ?? 'Unassigned'),
                    'school_name' => $firstRecord->session?->school?->school_name ?? '—',
                    'total_sessions' => $sessions,
                    'total_records' => $total,
                    'present' => $present,
                    'absent' => $absent,
                    'attendance_rate' => $attendanceRate,
                ];
            }

            // Add totals row
            if (count($rows) > 0) {
                $totals = [
                    'class_name' => 'TOTAL',
                    'school_name' => '',
                    'total_sessions' => array_sum(array_column($rows, 'total_sessions')),
                    'total_records' => array_sum(array_column($rows, 'total_records')),
                    'present' => array_sum(array_column($rows, 'present')),
                    'absent' => array_sum(array_column($rows, 'absent')),
                    'attendance_rate' => count($rows) > 0 ? round(array_sum(array_column($rows, 'present')) / array_sum(array_column($rows, 'total_records')) * 100, 1) : 0,
                ];
            }
        } elseif ($reportVariant === 'room_wise') {
            // Room-wise summary (sessions without class assignment)
            $title = 'Attendance Room-wise Summary';
            $columns = [
                ['key' => 'room_name', 'label' => 'Room', 'type' => 'text'],
                ['key' => 'school_name', 'label' => 'School', 'type' => 'text'],
                ['key' => 'total_sessions', 'label' => 'Sessions', 'type' => 'numeric'],
                ['key' => 'total_records', 'label' => 'Records', 'type' => 'numeric'],
                ['key' => 'present', 'label' => 'Present', 'type' => 'numeric'],
                ['key' => 'absent', 'label' => 'Absent', 'type' => 'numeric'],
                ['key' => 'attendance_rate', 'label' => 'Attendance Rate %', 'type' => 'numeric'],
            ];

            // Filter for sessions without class assignment
            $roomRecords = $records->filter(function ($record) {
                return !$record->session?->classModel && (!$record->session?->classes || $record->session->classes->isEmpty());
            });

            $grouped = $roomRecords->groupBy(function ($record) {
                return $record->session?->school_id ?? 'unassigned';
            });

            foreach ($grouped as $schoolId => $schoolRecords) {
                $firstRecord = $schoolRecords->first();
                $sessions = $schoolRecords->pluck('attendance_session_id')->unique()->count();
                $present = $schoolRecords->where('status', 'present')->count();
                $absent = $schoolRecords->where('status', 'absent')->count();
                $total = $schoolRecords->count();
                $attendanceRate = $total > 0 ? round(($present / $total) * 100, 1) : 0;

                $rows[] = [
                    'room_name' => 'General Room',
                    'school_name' => $firstRecord->session?->school?->school_name ?? '—',
                    'total_sessions' => $sessions,
                    'total_records' => $total,
                    'present' => $present,
                    'absent' => $absent,
                    'attendance_rate' => $attendanceRate,
                ];
            }

            // Add totals row
            if (count($rows) > 0) {
                $totals = [
                    'room_name' => 'TOTAL',
                    'school_name' => '',
                    'total_sessions' => array_sum(array_column($rows, 'total_sessions')),
                    'total_records' => array_sum(array_column($rows, 'total_records')),
                    'present' => array_sum(array_column($rows, 'present')),
                    'absent' => array_sum(array_column($rows, 'absent')),
                    'attendance_rate' => count($rows) > 0 ? round(array_sum(array_column($rows, 'present')) / array_sum(array_column($rows, 'total_records')) * 100, 1) : 0,
                ];
            }
        }

        // Add date range to title if available
        if ($dateRangeText) {
            $title .= " ({$dateRangeText})";
        }

        // Add totals row for Excel reports
        $columnConfig = [];
        $parameters = [
            'date_range' => $dateRangeText,
            'total_count' => count($rows),
        ];
        
        if (isset($totals) && $validated['report_type'] === 'excel') {
            // Mark totals row in parameters for Excel service
            $parameters['show_totals'] = true;
            $parameters['totals_row'] = $totals;
        }

        // Create report config
        $config = ReportConfig::fromArray([
            'report_key' => "attendance_{$reportVariant}",
            'report_type' => $validated['report_type'],
            'branding_id' => $validated['branding_id'] ?? $currentSchoolId,
            'title' => $title,
            'calendar_preference' => $calendarPreference,
            'language' => $language,
            'column_config' => $columnConfig,
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
            Log::error('Failed to generate attendance report', [
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
