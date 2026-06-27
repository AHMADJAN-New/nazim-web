<?php

namespace App\Services\Academic;

use App\Models\ClassAcademicYear;
use Illuminate\Support\Facades\DB;

class ClassAcademicYearDeletionService
{
    /**
     * @return array{
     *     can_delete: bool,
     *     blockers: array<int, array{key: string, count: int, message: string}>,
     *     active_student_count: int
     * }
     */
    public function assess(ClassAcademicYear $instance): array
    {
        $blockers = [];
        $classAcademicYearId = $instance->id;
        $organizationId = $instance->organization_id;
        $schoolId = $instance->school_id;

        $activeStudentCount = (int) DB::table('student_admissions')
            ->where('class_academic_year_id', $classAcademicYearId)
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->whereIn('enrollment_status', ['active', 'admitted'])
            ->count();

        $checks = [
            'student_admissions' => [
                'table' => 'student_admissions',
                'message' => fn (int $count) => "{$count} student admission(s) linked to this class section.",
            ],
            'exam_classes' => [
                'table' => 'exam_classes',
                'message' => fn (int $count) => "{$count} exam enrollment(s) linked to this class section.",
            ],
            'class_subjects' => [
                'table' => 'class_subjects',
                'message' => fn (int $count) => "{$count} subject assignment(s) linked to this class section.",
            ],
            'teacher_subject_assignments' => [
                'table' => 'teacher_subject_assignments',
                'message' => fn (int $count) => "{$count} teacher assignment(s) linked to this class section.",
            ],
            'timetable_entries' => [
                'table' => 'timetable_entries',
                'message' => fn (int $count) => "{$count} timetable entry(ies) linked to this class section.",
            ],
            'fee_structures' => [
                'table' => 'fee_structures',
                'message' => fn (int $count) => "{$count} fee structure(s) linked to this class section.",
            ],
            'fee_assignments' => [
                'table' => 'fee_assignments',
                'message' => fn (int $count) => "{$count} fee assignment(s) linked to this class section.",
            ],
            'exam_paper_templates' => [
                'table' => 'exam_paper_templates',
                'message' => fn (int $count) => "{$count} exam paper template(s) linked to this class section.",
            ],
            'questions' => [
                'table' => 'questions',
                'message' => fn (int $count) => "{$count} question bank item(s) linked to this class section.",
            ],
        ];

        foreach ($checks as $key => $config) {
            $count = (int) DB::table($config['table'])
                ->where('class_academic_year_id', $classAcademicYearId)
                ->where('organization_id', $organizationId)
                ->where('school_id', $schoolId)
                ->whereNull('deleted_at')
                ->count();

            if ($count > 0) {
                $blockers[] = [
                    'key' => $key,
                    'count' => $count,
                    'message' => $config['message']($count),
                ];
            }
        }

        return [
            'can_delete' => count($blockers) === 0,
            'blockers' => $blockers,
            'active_student_count' => $activeStudentCount,
        ];
    }
}
