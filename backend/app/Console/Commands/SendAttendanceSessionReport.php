<?php

namespace App\Console\Commands;

use App\Jobs\SendScheduledReportEmail;
use App\Models\AttendanceSession;
use App\Services\Reports\DateConversionService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Command to send attendance session closed reports via email
 * 
 * This should be triggered when an attendance session is closed
 * Usage: php artisan reports:attendance-session {session_id}
 * 
 * Or call from AttendanceSession model observer:
 * SendAttendanceSessionReport::dispatch($session->id);
 */
class SendAttendanceSessionReport extends Command
{
    protected $signature = 'reports:attendance-session {session_id}';

    protected $description = 'Generate and email attendance session closed report';

    public function handle(DateConversionService $dateService): int
    {
        $sessionId = $this->argument('session_id');

        $session = AttendanceSession::with(['class', 'academicYear'])
            ->find($sessionId);

        if (!$session) {
            $this->error("Attendance session not found: {$sessionId}");
            return Command::FAILURE;
        }

        if ($session->status !== 'closed') {
            $this->warn("Attendance session is not closed: {$session->status}");
            return Command::FAILURE;
        }

        try {
            // Build attendance report data
            $reportData = $this->buildAttendanceSessionData($session, $dateService);

            // Get recipients (class teachers, admins with attendance permission)
            $recipientUserIds = $this->getRecipients($session);

            // Dispatch job to generate and email report
            SendScheduledReportEmail::dispatch(
                reportKey: 'attendance_session_closed',
                organizationId: $session->organization_id,
                schoolId: $session->school_id,
                reportData: $reportData,
                recipientUserIds: $recipientUserIds,
                permission: 'attendance.reports.read', // Fallback permission
                subject: "Attendance Session Report - {$session->class->name} - {$dateService->formatDate($session->session_date, 'jalali', 'full', 'ps')}",
                config: [
                    'report_type' => 'pdf',
                    'title' => "Attendance Session Report - {$session->class->name}",
                    'calendar_preference' => 'jalali',
                    'language' => 'ps',
                ]
            );

            $this->info("Queued attendance session report for: {$session->class->name}");

            return Command::SUCCESS;

        } catch (\Throwable $e) {
            Log::error('Failed to queue attendance session report', [
                'session_id' => $sessionId,
                'error' => $e->getMessage(),
            ]);
            $this->error("Failed: {$e->getMessage()}");
            return Command::FAILURE;
        }
    }

    /**
     * Build attendance session report data
     */
    private function buildAttendanceSessionData(AttendanceSession $session, DateConversionService $dateService): array
    {
        // Get attendance records for this session
        $attendanceRecords = DB::table('attendance_records')
            ->where('attendance_session_id', $session->id)
            ->whereNull('deleted_at')
            ->get();

        // Get student details
        $studentIds = $attendanceRecords->pluck('student_id')->unique()->toArray();
        $students = DB::table('students')
            ->whereIn('id', $studentIds)
            ->whereNull('deleted_at')
            ->get()
            ->keyBy('id');

        // Build report rows
        $columns = [
            ['key' => 'student_name', 'label' => 'Student Name'],
            ['key' => 'admission_no', 'label' => 'Admission No'],
            ['key' => 'status', 'label' => 'Status'],
            ['key' => 'check_in_time', 'label' => 'Check In'],
            ['key' => 'check_out_time', 'label' => 'Check Out'],
        ];

        $rows = [];
        foreach ($attendanceRecords as $record) {
            $student = $students->get($record->student_id);
            if (!$student) continue;

            $rows[] = [
                'student_name' => $student->full_name ?? '',
                'admission_no' => $student->admission_no ?? '',
                'status' => $record->status ?? 'absent',
                'check_in_time' => $record->check_in_time ? $dateService->formatDate($record->check_in_time, 'jalali', 'full', 'ps') . ' ' . date('H:i', strtotime($record->check_in_time)) : '-',
                'check_out_time' => $record->check_out_time ? $dateService->formatDate($record->check_out_time, 'jalali', 'full', 'ps') . ' ' . date('H:i', strtotime($record->check_out_time)) : '-',
            ];
        }

        // Add summary row
        $presentCount = $attendanceRecords->where('status', 'present')->count();
        $absentCount = $attendanceRecords->where('status', 'absent')->count();
        $lateCount = $attendanceRecords->where('status', 'late')->count();

        return [
            'columns' => $columns,
            'rows' => $rows,
            'summary' => [
                'total_students' => $attendanceRecords->count(),
                'present' => $presentCount,
                'absent' => $absentCount,
                'late' => $lateCount,
                'attendance_rate' => $attendanceRecords->count() > 0 
                    ? round(($presentCount / $attendanceRecords->count()) * 100, 2) 
                    : 0,
            ],
        ];
    }

    /**
     * Get recipients for attendance session report
     */
    private function getRecipients(AttendanceSession $session): array
    {
        $recipients = [];

        // Get class teacher
        if ($session->class && $session->class->teacher_id) {
            $recipients[] = $session->class->teacher_id;
        }

        // Get users with attendance.reports.read permission
        $users = DB::table('model_has_permissions')
            ->join('permissions', 'model_has_permissions.permission_id', '=', 'permissions.id')
            ->join('users', 'model_has_permissions.model_id', '=', 'users.id')
            ->where('permissions.name', 'attendance.reports.read')
            ->where(function ($q) use ($session) {
                $q->where('permissions.organization_id', $session->organization_id)
                    ->orWhereNull('permissions.organization_id');
            })
            ->whereNotNull('users.email')
            ->pluck('users.id')
            ->toArray();

        $recipients = array_merge($recipients, $users);
        $recipients = array_unique($recipients);

        return $recipients;
    }
}

