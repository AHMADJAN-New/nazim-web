<?php

namespace App\Services\Academic;

use App\Models\AcademicYear;
use App\Models\ClassAcademicYear;

class AcademicYearDeletionService
{
    public function __construct(
        private ClassAcademicYearDeletionService $classAcademicYearDeletionService
    ) {}

    /**
     * @return array{
     *     can_delete: bool,
     *     blockers: array<int, array{key: string, count: int, message: string}>,
     *     assigned_class_count: int,
     *     class_instances: array<int, array{
     *         id: string,
     *         class_id: string,
     *         class_name: string,
     *         section_name: string|null,
     *         can_remove: bool,
     *         active_student_count: int,
     *         blockers: array<int, array{key: string, count: int, message: string}>
     *     }>
     * }
     */
    public function assess(AcademicYear $academicYear, string $schoolId): array
    {
        $instances = ClassAcademicYear::query()
            ->whereNull('deleted_at')
            ->where('academic_year_id', $academicYear->id)
            ->where('organization_id', $academicYear->organization_id)
            ->where('school_id', $schoolId)
            ->with('class')
            ->orderBy('section_name')
            ->get();

        $blockers = [];
        $classInstances = [];

        if ($instances->isNotEmpty()) {
            $blockers[] = [
                'key' => 'class_academic_years',
                'count' => $instances->count(),
                'message' => "{$instances->count()} class section(s) still assigned to this academic year.",
            ];

            foreach ($instances as $instance) {
                $instanceAssessment = $this->classAcademicYearDeletionService->assess($instance);

                $classInstances[] = [
                    'id' => $instance->id,
                    'class_id' => $instance->class_id,
                    'class_name' => $instance->class?->name ?? 'Unknown',
                    'section_name' => $instance->section_name,
                    'can_remove' => $instanceAssessment['can_delete'],
                    'active_student_count' => $instanceAssessment['active_student_count'],
                    'blockers' => $instanceAssessment['blockers'],
                ];
            }
        }

        return [
            'can_delete' => $instances->isEmpty(),
            'blockers' => $blockers,
            'assigned_class_count' => $instances->count(),
            'class_instances' => $classInstances,
        ];
    }
}
