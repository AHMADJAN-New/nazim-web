<?php

namespace App\Services\Reports;

/**
 * Shared PDF payload helpers for student lifetime history reports.
 */
class StudentHistoryPdfPayload
{
    /**
     * Map StudentHistoryService attendance summary (camelCase) to Blade keys.
     *
     * @param  array<string, mixed>  $summary
     * @return array{total_days: int, present: int, absent: int, late: int, rate: float}
     */
    public static function mapAttendanceSummary(array $summary): array
    {
        return [
            'total_days' => (int) ($summary['totalRecords'] ?? $summary['totalDays'] ?? $summary['total_days'] ?? 0),
            'present' => (int) ($summary['presentCount'] ?? $summary['present'] ?? 0),
            'absent' => (int) ($summary['absentCount'] ?? $summary['absent'] ?? 0),
            'late' => (int) ($summary['lateCount'] ?? $summary['late'] ?? 0),
            'rate' => round((float) ($summary['attendanceRate'] ?? $summary['rate'] ?? 0), 2),
        ];
    }
}
