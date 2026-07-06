<?php

namespace App\Services\Academic;

use App\Models\ClassAcademicYear;
use App\Models\StudentAdmission;
use Illuminate\Contracts\Database\Query\Builder as QueryBuilder;
use Illuminate\Database\Eloquent\Builder;

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
            $query->where("{$table}.academic_year_id", $academicYearId);
        }

        if (! empty($classId)) {
            $this->scopeValidClassPlacement($query, $table);
            $query->whereExists(function ($subQuery) use ($classId, $table) {
                $subQuery->selectRaw('1')
                    ->from('class_academic_years as cay')
                    ->whereColumn('cay.id', "{$table}.class_academic_year_id")
                    ->whereNull('cay.deleted_at')
                    ->where('cay.class_id', $classId);
            });
        } elseif (! empty($classAcademicYearId)) {
            $this->scopeValidClassPlacement($query, $table);
            $query->where("{$table}.class_academic_year_id", $classAcademicYearId);
        }

        return $query;
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
