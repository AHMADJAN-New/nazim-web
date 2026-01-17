<?php

namespace App\Observers;

use App\Jobs\SendScheduledReportEmail;
use App\Models\AttendanceSession;
use App\Services\Reports\DateConversionService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Observer for AttendanceSession model
 * Triggers report email when session is closed
 */
class AttendanceSessionObserver
{
    public function __construct(
        private DateConversionService $dateService
    ) {
    }

    /**
     * Handle the AttendanceSession "updated" event.
     */
    public function updated(AttendanceSession $session): void
    {
        // Check if status changed to 'closed'
        if ($session->isDirty('status') && $session->status === 'closed') {
            Log::info('Attendance session closed, triggering report email', [
                'session_id' => $session->id,
                'organization_id' => $session->organization_id,
                'school_id' => $session->school_id,
            ]);

            // Dispatch job to generate and email report
            // This will be queued and processed asynchronously
            try {
                SendScheduledReportEmail::dispatch(
                    reportKey: 'attendance_session_closed',
                    organizationId: $session->organization_id,
                    schoolId: $session->school_id,
                    reportData: $this->buildAttendanceSessionData($session),
                    recipientUserIds: $this->getRecipients($session),
                    permission: 'attendance.reports.read',
                    subject: "Attendance Session Report - {$session->classModel->name ?? 'Class'} - {$this->dateService->formatDate($session->session_date, 'jalali', 'full', 'ps')}",
                    config: [
                        'report_type' => 'pdf',
                        'title' => "Attendance Session Report - {$session->classModel->name ?? 'Class'}",
                        'calendar_preference' => 'jalali',
                        'language' => 'ps',
                    ]
                );

                Log::info('Attendance session report queued', [
                    'session_id' => $session->id,
                ]);
            } catch (\Throwable $e) {
                Log::error('Failed to queue attendance session report', [
                    'session_id' => $session->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * Build attendance session report data
     */
    private function buildAttendanceSessionData(AttendanceSession $session): array
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
                'check_in_time' => $record->check_in_time 
                    ? $this->dateService->formatDate($record->check_in_time, 'jalali', 'full', 'ps') . ' ' . date('H:i', strtotime($record->check_in_time)) 
                    : '-',
                'check_out_time' => $record->check_out_time 
                    ? $this->dateService->formatDate($record->check_out_time, 'jalali', 'full', 'ps') . ' ' . date('H:i', strtotime($record->check_out_time)) 
                    : '-',
            ];
        }

        // Add summary
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
        if ($session->classModel && $session->classModel->teacher_id) {
            $recipients[] = $session->classModel->teacher_id;
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

