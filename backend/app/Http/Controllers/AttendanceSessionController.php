<?php

namespace App\Http\Controllers;

use App\Http\Requests\AttendanceScanRequest;
use App\Http\Requests\MarkAttendanceRecordsRequest;
use App\Http\Requests\StoreAttendanceSessionRequest;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\ClassModel;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AttendanceSessionController extends Controller
{
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

        $schoolIds = $this->getAccessibleSchoolIds($profile);
        if (empty($schoolIds)) {
            return response()->json([]);
        }

        $query = AttendanceSession::with(['classModel', 'classes', 'school'])
            ->where('organization_id', $profile->organization_id)
            ->where(function ($q) use ($schoolIds) {
                $q->whereNull('school_id')->orWhereIn('school_id', $schoolIds);
            });

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

        $schoolIds = $this->getAccessibleSchoolIds($profile);
        if ($request->filled('school_id') && !in_array($request->school_id, $schoolIds, true)) {
            return response()->json(['error' => 'School not accessible'], 403);
        }

        $validated = $request->validated();

        // Determine class IDs: use class_ids array if provided, otherwise use class_id (backward compatibility)
        $classIds = !empty($validated['class_ids']) ? $validated['class_ids'] : 
                    (!empty($validated['class_id']) ? [$validated['class_id']] : []);

        if (empty($classIds)) {
            return response()->json(['error' => 'At least one class is required'], 422);
        }

        // Validate all classes belong to the organization
        $classes = ClassModel::whereIn('id', $classIds)
            ->where('organization_id', $profile->organization_id)
            ->get();

        if ($classes->count() !== count($classIds)) {
            return response()->json(['error' => 'One or more classes not found for this organization'], 404);
        }

        // Use first class_id for backward compatibility (can be null if using only class_ids)
        $primaryClassId = $classIds[0] ?? null;

        $session = DB::transaction(function () use ($validated, $profile, $user, $primaryClassId, $classIds) {
            $session = AttendanceSession::create([
                'organization_id' => $profile->organization_id,
                'school_id' => $validated['school_id'] ?? null,
                'class_id' => $primaryClassId, // Keep for backward compatibility
                'academic_year_id' => $validated['academic_year_id'] ?? null,
                'session_date' => Carbon::parse($validated['session_date'])->toDateString(),
                'method' => $validated['method'],
                'status' => $validated['status'] ?? 'open',
                'remarks' => $validated['remarks'] ?? null,
                'created_by' => $user->id,
            ]);

            // Attach all classes via pivot table
            $session->classes()->attach($classIds, [
                'organization_id' => $profile->organization_id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if (!empty($validated['records'])) {
                foreach ($validated['records'] as $record) {
                    AttendanceRecord::create([
                        'attendance_session_id' => $session->id,
                        'organization_id' => $profile->organization_id,
                        'school_id' => $validated['school_id'] ?? null,
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

        $schoolIds = $this->getAccessibleSchoolIds($profile);
        $session = AttendanceSession::with([
            'classModel',
            'classes', // Load all classes for multi-class sessions
            'school',
            'records.student',
        ])->where('organization_id', $profile->organization_id)
            ->where(function ($q) use ($schoolIds) {
                $q->whereNull('school_id')->orWhereIn('school_id', $schoolIds);
            })
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

        $schoolIds = $this->getAccessibleSchoolIds($profile);
        if (empty($schoolIds)) {
            return response()->json(['error' => 'User has no accessible schools'], 403);
        }
        $session = AttendanceSession::where('organization_id', $profile->organization_id)
            ->where(function ($q) use ($schoolIds) {
                $q->whereNull('school_id')->orWhereIn('school_id', $schoolIds);
            })
            ->find($id);

        if (!$session) {
            return response()->json(['error' => 'Attendance session not found'], 404);
        }

        $session->update([
            'status' => $validated['status'] ?? $session->status,
            'remarks' => $validated['remarks'] ?? $session->remarks,
            'closed_at' => ($validated['status'] ?? $session->status) === 'closed' ? now() : null,
        ]);

        return response()->json($session->fresh(['classModel', 'classes', 'school']));
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

        $schoolIds = $this->getAccessibleSchoolIds($profile);
        if (empty($schoolIds)) {
            return response()->json(['error' => 'User has no accessible schools'], 403);
        }

        $session = AttendanceSession::where('organization_id', $profile->organization_id)
            ->where(function ($q) use ($schoolIds) {
                $q->whereNull('school_id')->orWhereIn('school_id', $schoolIds);
            })
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

        return response()->json($session->fresh(['classModel', 'classes', 'school']));
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

        $schoolIds = $this->getAccessibleSchoolIds($profile);
        if (empty($schoolIds)) {
            return response()->json(['error' => 'User has no accessible schools'], 403);
        }
        $session = AttendanceSession::where('organization_id', $profile->organization_id)
            ->where(function ($q) use ($schoolIds) {
                $q->whereNull('school_id')->orWhereIn('school_id', $schoolIds);
            })
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

        $schoolIds = $this->getAccessibleSchoolIds($profile);
        $session = AttendanceSession::where('organization_id', $profile->organization_id)
            ->where(function ($q) use ($schoolIds) {
                $q->whereNull('school_id')->orWhereIn('school_id', $schoolIds);
            })
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

        $schoolIds = $this->getAccessibleSchoolIds($profile);
        $session = AttendanceSession::where('organization_id', $profile->organization_id)
            ->where(function ($q) use ($schoolIds) {
                $q->whereNull('school_id')->orWhereIn('school_id', $schoolIds);
            })
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
            ->get();

        if ($classes->count() !== count($classIds)) {
            return response()->json(['error' => 'One or more classes not found for this organization'], 404);
        }

        $schoolIds = $this->getAccessibleSchoolIds($profile);
        if (empty($schoolIds)) {
            return response()->json([]);
        }

        // Get students from all classes
        $students = DB::table('student_admissions as sa')
            ->join('students as s', 'sa.student_id', '=', 's.id')
            ->whereIn('sa.class_id', $classIds)
            ->where('sa.organization_id', $profile->organization_id)
            ->when($request->filled('academic_year_id'), function ($q) use ($request) {
                $q->where('sa.academic_year_id', $request->input('academic_year_id'));
            })
            ->whereNull('sa.deleted_at')
            ->whereNull('s.deleted_at')
            ->where(function ($q) use ($schoolIds) {
                $q->whereNull('sa.school_id')->orWhereIn('sa.school_id', $schoolIds);
            })
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
            'school_id' => 'nullable|uuid|exists:school_branding,id',
            'academic_year_id' => 'nullable|uuid|exists:academic_years,id',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'status' => 'nullable|string|in:present,absent,late,excused,sick,leave',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $schoolIds = $this->getAccessibleSchoolIds($profile);
        if (empty($schoolIds)) {
            return response()->json(['data' => [], 'total' => 0, 'current_page' => 1, 'per_page' => 25, 'last_page' => 1]);
        }

        $query = AttendanceRecord::with(['student:id,full_name,admission_no,card_number,student_code', 'session.classModel', 'session.classes', 'session.school'])
            ->where('attendance_records.organization_id', $profile->organization_id)
            ->whereNull('attendance_records.deleted_at')
            ->whereHas('session', function ($q) use ($schoolIds) {
                $q->where(function ($sq) use ($schoolIds) {
                    $sq->whereNull('school_id')->orWhereIn('school_id', $schoolIds);
                })->whereNull('deleted_at');
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

        if ($request->filled('school_id')) {
            $query->where('attendance_records.school_id', $request->input('school_id'));
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
}
