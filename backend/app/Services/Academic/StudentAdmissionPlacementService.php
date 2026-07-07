<?php

namespace App\Services\Academic;

use App\Models\AcademicYear;
use App\Models\ClassAcademicYear;
use App\Models\StudentAdmission;
use Illuminate\Contracts\Database\Query\Builder as QueryBuilder;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class StudentAdmissionPlacementService
{
    public const STATUS_PLACED = 'placed';

    public const STATUS_ORPHANED = 'orphaned';

    public const STATUS_UNPLACED = 'unplaced';

    public const STATUS_NOT_CURRENT = 'not_current';

    /**
     * @return array{placement_status: string, has_valid_class_placement: bool}
     */
    public function resolve(StudentAdmission $admission): array
    {
        $isCurrentEnrollment = StudentAdmission::isCurrentEnrollmentStatus($admission->enrollment_status);

        if (! $isCurrentEnrollment) {
            return [
                'placement_status' => self::STATUS_NOT_CURRENT,
                'has_valid_class_placement' => false,
            ];
        }

        if ($this->hasValidClassPlacement($admission)) {
            return [
                'placement_status' => self::STATUS_PLACED,
                'has_valid_class_placement' => true,
            ];
        }

        if ($admission->class_academic_year_id !== null) {
            return [
                'placement_status' => self::STATUS_ORPHANED,
                'has_valid_class_placement' => false,
            ];
        }

        return [
            'placement_status' => self::STATUS_UNPLACED,
            'has_valid_class_placement' => false,
        ];
    }

    public function hasValidClassPlacement(StudentAdmission $admission): bool
    {
        if ($admission->class_academic_year_id === null) {
            return false;
        }

        $cay = $admission->relationLoaded('classAcademicYear')
            ? $admission->classAcademicYear
            : ClassAcademicYear::query()
                ->where('id', $admission->class_academic_year_id)
                ->whereNull('deleted_at')
                ->first();

        if (! $cay) {
            return false;
        }

        if ((string) $cay->organization_id !== (string) $admission->organization_id) {
            return false;
        }

        if ((string) $cay->school_id !== (string) $admission->school_id) {
            return false;
        }

        if ($admission->academic_year_id !== null
            && (string) $cay->academic_year_id !== (string) $admission->academic_year_id) {
            return false;
        }

        return true;
    }

    /**
     * Apply academic year and class/section filters with valid class placement rules.
     */
    public function applyClassAcademicFilters(
        QueryBuilder $query,
        ?string $academicYearId,
        ?string $classId,
        ?string $classAcademicYearId,
        string $table = 'student_admissions'
    ): QueryBuilder {
        if (! empty($academicYearId)) {
            $this->applyAcademicYearFilterOnAdmissionTable($query, $academicYearId, $table);
        }

        if (! empty($classId) || ! empty($classAcademicYearId)) {
            $this->scopeValidClassPlacement($query, $table);
        }

        if (! empty($classId)) {
            $query->whereExists(function ($subQuery) use ($classId, $table) {
                $subQuery->selectRaw('1')
                    ->from('class_academic_years as cay')
                    ->whereColumn('cay.id', "{$table}.class_academic_year_id")
                    ->whereNull('cay.deleted_at')
                    ->where('cay.class_id', $classId);
            });
        }

        if (! empty($classAcademicYearId)) {
            $query->where("{$table}.class_academic_year_id", $classAcademicYearId);
        }

        return $query;
    }

    /**
     * Match admissions by academic_year_id, including legacy rows that only have admission_year text.
     */
    public function applyAcademicYearFilterOnAdmissionTable(
        QueryBuilder $query,
        string $academicYearId,
        string $table = 'student_admissions'
    ): QueryBuilder {
        return $query->where(function ($yearQuery) use ($academicYearId, $table) {
            $yearQuery->where("{$table}.academic_year_id", $academicYearId)
                ->orWhere(function ($legacyQuery) use ($academicYearId, $table) {
                    $legacyQuery->whereNull("{$table}.academic_year_id")
                        ->whereExists(function ($nameMatch) use ($academicYearId, $table) {
                            $nameMatch->selectRaw('1')
                                ->from('academic_years as ay')
                                ->whereColumn('ay.name', "{$table}.admission_year")
                                ->where('ay.id', $academicYearId)
                                ->whereNull('ay.deleted_at');
                        });
                });
        });
    }

    /**
     * Apply with/without admission filters on the students table, optionally scoped to academic year/class.
     */
    public function applyStudentAdmissionPresenceFilters(
        QueryBuilder $query,
        ?string $admissionPresence,
        ?string $academicYearId,
        ?string $classId,
        ?string $classAcademicYearId,
        string $organizationId,
        string $schoolId
    ): QueryBuilder {
        $hasPlacementFilter = ! empty($academicYearId) || ! empty($classId) || ! empty($classAcademicYearId);

        $applyAdmissionMatch = function (QueryBuilder $subQuery) use (
            $academicYearId,
            $classId,
            $classAcademicYearId,
            $organizationId,
            $schoolId,
            $hasPlacementFilter
        ): void {
            $subQuery->select(DB::raw('1'))
                ->from('student_admissions as sa')
                ->whereColumn('sa.student_id', 'students.id')
                ->whereNull('sa.deleted_at')
                ->where('sa.organization_id', $organizationId)
                ->where('sa.school_id', $schoolId);

            if ($hasPlacementFilter) {
                $this->applyClassAcademicFilters(
                    $subQuery,
                    $academicYearId ?: null,
                    $classId ?: null,
                    $classAcademicYearId ?: null,
                    'sa'
                );
            }
        };

        if ($admissionPresence === 'with_admission') {
            $query->whereExists(function (QueryBuilder $subQuery) use ($applyAdmissionMatch) {
                $applyAdmissionMatch($subQuery);
            });
        } elseif ($admissionPresence === 'without_admission') {
            $query->whereNotExists(function (QueryBuilder $subQuery) use ($applyAdmissionMatch) {
                $applyAdmissionMatch($subQuery);
            });
        } elseif ($hasPlacementFilter) {
            $query->whereExists(function (QueryBuilder $subQuery) use ($applyAdmissionMatch) {
                $applyAdmissionMatch($subQuery);
            });
        }

        return $query;
    }

    /**
     * Ensure student_admissions rows have academic_year_id aligned with admission_year text when possible.
     *
     * @param  array<string, mixed>  $validated
     */
    public function normalizeAdmissionAcademicYear(
        array &$validated,
        string $organizationId,
        string $schoolId
    ): void {
        if (! empty($validated['class_academic_year_id'])) {
            return;
        }

        if (! empty($validated['academic_year_id'])) {
            if (empty($validated['admission_year'])) {
                $year = AcademicYear::query()
                    ->where('id', $validated['academic_year_id'])
                    ->where('organization_id', $organizationId)
                    ->where('school_id', $schoolId)
                    ->whereNull('deleted_at')
                    ->first();

                if ($year) {
                    $validated['admission_year'] = $year->name;
                }
            }

            return;
        }

        if (! empty($validated['admission_year'])) {
            $year = AcademicYear::query()
                ->where('organization_id', $organizationId)
                ->where('school_id', $schoolId)
                ->whereNull('deleted_at')
                ->where('name', $validated['admission_year'])
                ->first();

            if ($year) {
                $validated['academic_year_id'] = $year->id;

                return;
            }
        }

        $currentYear = AcademicYear::query()
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->where('is_current', true)
            ->first();

        if (! $currentYear) {
            $today = now()->toDateString();
            $currentYear = AcademicYear::query()
                ->where('organization_id', $organizationId)
                ->where('school_id', $schoolId)
                ->whereNull('deleted_at')
                ->whereDate('start_date', '<=', $today)
                ->whereDate('end_date', '>=', $today)
                ->orderByDesc('start_date')
                ->first();
        }

        if ($currentYear) {
            $validated['academic_year_id'] = $currentYear->id;
            if (empty($validated['admission_year'])) {
                $validated['admission_year'] = $currentYear->name;
            }
        }
    }

    public function scopeValidClassPlacement(QueryBuilder $query, string $table = 'student_admissions'): QueryBuilder
    {
        return $query->whereNotNull("{$table}.class_academic_year_id")
            ->whereExists(function ($subQuery) use ($table) {
                $subQuery->selectRaw('1')
                    ->from('class_academic_years as cay')
                    ->whereColumn('cay.id', "{$table}.class_academic_year_id")
                    ->whereNull('cay.deleted_at')
                    ->whereColumn('cay.organization_id', "{$table}.organization_id")
                    ->whereColumn('cay.school_id', "{$table}.school_id")
                    ->where(function ($yearMatch) use ($table) {
                        $yearMatch->whereNull("{$table}.academic_year_id")
                            ->orWhereColumn('cay.academic_year_id', "{$table}.academic_year_id");
                    });
            });
    }

    /**
     * @param  Builder<StudentAdmission>  $query
     * @return Builder<StudentAdmission>
     */
    public function scopeOrphanedClassPlacement(Builder $query): Builder
    {
        return $query->whereNotNull('student_admissions.class_academic_year_id')
            ->whereNotExists(function ($subQuery) {
                $subQuery->selectRaw('1')
                    ->from('class_academic_years as cay')
                    ->whereColumn('cay.id', 'student_admissions.class_academic_year_id')
                    ->whereNull('cay.deleted_at')
                    ->whereColumn('cay.organization_id', 'student_admissions.organization_id')
                    ->whereColumn('cay.school_id', 'student_admissions.school_id')
                    ->where(function ($yearMatch) {
                        $yearMatch->whereNull('student_admissions.academic_year_id')
                            ->orWhereColumn('cay.academic_year_id', 'student_admissions.academic_year_id');
                    });
            });
    }

    /**
     * @param  Builder<StudentAdmission>  $query
     * @return Builder<StudentAdmission>
     */
    public function scopeUnplacedCurrentEnrollment(Builder $query): Builder
    {
        return $query->whereIn('student_admissions.enrollment_status', StudentAdmission::CURRENT_ENROLLMENT_STATUSES)
            ->where(function ($placementQuery) {
                $placementQuery->whereNull('student_admissions.class_academic_year_id')
                    ->orWhere(function ($orphanQuery) {
                        $this->scopeOrphanedClassPlacement($orphanQuery);
                    });
            });
    }

    /**
     * Admissions without a live class section (null CAY id or orphaned reference).
     *
     * @param  Builder<StudentAdmission>  $query
     * @return Builder<StudentAdmission>
     */
    public function scopeWithoutValidClassPlacement(Builder $query): Builder
    {
        return $query->where(function ($placementQuery) {
            $placementQuery->whereNull('student_admissions.class_academic_year_id')
                ->orWhere(function ($orphanQuery) {
                    $this->scopeOrphanedClassPlacement($orphanQuery);
                });
        });
    }

    /**
     * @param  Builder<StudentAdmission>  $query
     * @return Builder<StudentAdmission>
     */
    public function scopeByPlacement(Builder $query, string $placement): Builder
    {
        return match ($placement) {
            self::STATUS_PLACED => $this->scopeValidClassPlacement($query)
                ->whereIn('student_admissions.enrollment_status', StudentAdmission::CURRENT_ENROLLMENT_STATUSES),
            self::STATUS_ORPHANED => $this->scopeOrphanedClassPlacement($query)
                ->whereIn('student_admissions.enrollment_status', StudentAdmission::CURRENT_ENROLLMENT_STATUSES),
            self::STATUS_UNPLACED => $this->scopeUnplacedCurrentEnrollment($query),
            default => $query,
        };
    }

    public function appendToAdmission(StudentAdmission $admission): StudentAdmission
    {
        $resolved = $this->resolve($admission);
        $admission->has_valid_class_placement = $resolved['has_valid_class_placement'];
        $admission->placement_status = $resolved['placement_status'];

        return $admission;
    }

    /**
     * @param  \Illuminate\Support\Collection<int, StudentAdmission>|\Illuminate\Database\Eloquent\Collection<int, StudentAdmission>  $admissions
     * @return \Illuminate\Support\Collection<int, StudentAdmission>|\Illuminate\Database\Eloquent\Collection<int, StudentAdmission>
     */
    public function appendToCollection($admissions)
    {
        return $admissions->map(fn (StudentAdmission $admission) => $this->appendToAdmission($admission));
    }
}
