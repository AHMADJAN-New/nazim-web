<?php

namespace App\Services;

use App\Models\OrganizationCounter;
use App\Models\ShortTermCourse;
use App\Services\Reports\DateConversionService;
use Illuminate\Support\Facades\DB;

class CourseStudentAdmissionService
{
    public function __construct(
        private DateConversionService $dateService
    ) {}

    /**
     * Generate a unique course-student admission number for the given course.
     * Format: CS-{courseCode}-{year}-{seq} (e.g. CS-ABC-25-001).
     * Uses OrganizationCounter with lockForUpdate for concurrency safety.
     */
    public function generateForCourse(ShortTermCourse $course, string $organizationId, string $schoolId): string
    {
        $courseCode = $this->normalizeCourseCode($course->name ?? 'GEN');
        $date = $course->start_date ? $course->start_date : now();
        $year = $this->getJalaliYear2Digit($date);

        return $this->nextNumber($organizationId, $schoolId, $courseCode, $year);
    }

    /**
     * Generate a unique course-student admission number when course is not available.
     * Uses generic course code GEN.
     */
    public function generateWithoutCourse(string $organizationId, string $schoolId): string
    {
        $courseCode = 'GEN';
        $year = $this->getJalaliYear2Digit(now());

        return $this->nextNumber($organizationId, $schoolId, $courseCode, $year);
    }

    private function getJalaliYear2Digit($date): string
    {
        $shamsiDate = $this->dateService->getDateComponents($date, 'jalali');

        return substr((string) $shamsiDate['year'], -2);
    }

    private function normalizeCourseCode(?string $name): string
    {
        $code = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $name ?? 'GEN'), 0, 3));

        return strlen($code) < 3 ? 'GEN' : $code;
    }

    /**
     * Reserve the next sequence number under lock and return formatted admission number.
     */
    private function nextNumber(string $organizationId, string $schoolId, string $courseCode, string $year): string
    {
        $counterType = "course_student_{$schoolId}_{$year}_{$courseCode}";

        $sequence = DB::transaction(function () use ($organizationId, $counterType) {
            $counter = OrganizationCounter::lockForUpdate()
                ->where('organization_id', $organizationId)
                ->where('counter_type', $counterType)
                ->first();

            if (! $counter) {
                $counter = OrganizationCounter::create([
                    'organization_id' => $organizationId,
                    'counter_type' => $counterType,
                    'last_value' => 0,
                ]);
            }

            $counter->increment('last_value');
            $counter->refresh();

            return (int) $counter->last_value;
        });

        return sprintf('CS-%s-%s-%03d', $courseCode, $year, $sequence);
    }
}
