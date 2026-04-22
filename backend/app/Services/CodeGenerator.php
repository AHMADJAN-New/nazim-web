<?php

namespace App\Services;

use App\Models\OrganizationCounter;
use Illuminate\Support\Facades\DB;

class CodeGenerator
{
    /**
     * Generate a student code for the given organization.
     * Format: ST-{SEGMENT}-{SEQUENCE} where SEGMENT is the first 4-digit year in the
     * current academic year's name for this org/school (fallback: calendar year).
     */
    public static function generateStudentCode(string $organizationId, ?string $schoolId = null): string
    {
        return self::generateCode(
            $organizationId,
            OrganizationCounter::COUNTER_TYPE_STUDENTS,
            'ST',
            $schoolId
        );
    }

    /**
     * First 4-digit sequence in academic year name (e.g. "1405-1406" → "1405", "2024-2025" → "2024").
     */
    public static function fourDigitsFromAcademicYearName(?string $name): ?string
    {
        if ($name === null || trim($name) === '') {
            return null;
        }
        if (preg_match('/(\d{4})/u', $name, $m)) {
            return $m[1];
        }

        return null;
    }

    /**
     * Middle segment for ST-* codes from academic_years (current row), else calendar YYYY.
     */
    public static function studentCodeMiddleSegmentFromAcademicYear(string $organizationId, ?string $schoolId): string
    {
        $base = DB::table('academic_years')
            ->where('organization_id', $organizationId)
            ->where('is_current', true)
            ->whereNull('deleted_at');

        if (is_string($schoolId) && $schoolId !== '') {
            $row = (clone $base)->where('school_id', $schoolId)->orderByDesc('start_date')->first(['name']);
            if ($row && ($seg = self::fourDigitsFromAcademicYearName($row->name))) {
                return $seg;
            }
        }

        $row = (clone $base)->whereNull('school_id')->orderByDesc('start_date')->first(['name']);
        if ($row && ($seg = self::fourDigitsFromAcademicYearName($row->name))) {
            return $seg;
        }

        $row = (clone $base)->orderByDesc('start_date')->first(['name']);
        if ($row && ($seg = self::fourDigitsFromAcademicYearName($row->name))) {
            return $seg;
        }

        return date('Y');
    }

    /**
     * Highest numeric sequence segment from existing ST-* student_code values (read-only).
     */
    public static function maxStudentSequenceFromExistingCodes(string $organizationId): int
    {
        $row = DB::selectOne(
            <<<'SQL'
            SELECT COALESCE(MAX((regexp_match(student_code, '^ST-(?:[0-9]{2}|[0-9]{4})-([0-9]+)$'))[1]::int), 0) AS max_seq
            FROM students
            WHERE organization_id = ?
              AND deleted_at IS NULL
              AND student_code IS NOT NULL
              AND student_code ~ '^ST-(?:[0-9]{2}|[0-9]{4})-[0-9]+$'
            SQL,
            [$organizationId]
        );

        return (int) ($row->max_seq ?? 0);
    }

    /**
     * Preview ST-* codes in the same order as backfill/import (per-row academic year segment).
     *
     * @param  array<int, string|null>  $schoolIdsOrdered  school_id per code slot (null = org-level lookup only)
     * @return string[]
     */
    public static function previewStudentCodesInAssignmentOrder(string $organizationId, array $schoolIdsOrdered): array
    {
        if ($schoolIdsOrdered === []) {
            return [];
        }

        $maxSeq = self::maxStudentSequenceFromExistingCodes($organizationId);
        $counterLast = (int) DB::table('organization_counters')
            ->where('organization_id', $organizationId)
            ->where('counter_type', OrganizationCounter::COUNTER_TYPE_STUDENTS)
            ->value('last_value');
        $L = max($counterLast, $maxSeq);

        $codes = [];
        foreach ($schoolIdsOrdered as $i => $schoolId) {
            $seq = $L + $i + 1;
            $middle = self::studentCodeMiddleSegmentFromAcademicYear(
                $organizationId,
                is_string($schoolId) && $schoolId !== '' ? $schoolId : null
            );
            $codes[] = 'ST-'.$middle.'-'.self::formatStudentSequence($seq);
        }

        return $codes;
    }

    /**
     * Allocate the next N student codes after syncing counter with existing ST-* max (one transaction).
     *
     * @param  array<int, string|null>  $schoolIdsPerCode
     * @return string[]
     */
    public static function allocateStudentCodesAfterSync(string $organizationId, array $schoolIdsPerCode): array
    {
        if ($schoolIdsPerCode === []) {
            return [];
        }

        return DB::transaction(function () use ($organizationId, $schoolIdsPerCode) {
            $maxSeq = self::maxStudentSequenceFromExistingCodes($organizationId);

            $counter = OrganizationCounter::lockForUpdate()
                ->where('organization_id', $organizationId)
                ->where('counter_type', OrganizationCounter::COUNTER_TYPE_STUDENTS)
                ->first();

            if (! $counter) {
                $counter = OrganizationCounter::create([
                    'organization_id' => $organizationId,
                    'counter_type' => OrganizationCounter::COUNTER_TYPE_STUDENTS,
                    'last_value' => 0,
                ]);
            }

            if ($counter->last_value < $maxSeq) {
                $counter->update(['last_value' => $maxSeq]);
            }
            $startSequence = max($maxSeq, (int) $counter->last_value) + 1;
            $endSequence = $startSequence + count($schoolIdsPerCode) - 1;

            if ((int) $counter->last_value !== $endSequence) {
                $counter->update(['last_value' => $endSequence]);
            }

            $middleSegmentsBySchool = [];
            $codes = [];
            foreach ($schoolIdsPerCode as $schoolId) {
                $counter->increment('last_value');
                $counter->refresh();
                $middle = self::studentCodeMiddleSegmentFromAcademicYear(
                    $organizationId,
                    is_string($schoolId) && $schoolId !== '' ? $schoolId : null
                );
                $codes[] = 'ST-'.$middle.'-'.self::formatStudentSequence((int) $counter->last_value);
            }

            return $codes;
        });
    }

    /**
     * Align organization_counters.last_value with the highest numeric suffix already used
     * in student_code (ST-{2 or 4 digit year}-{digits}) for this organization.
     * Does not modify any student rows — only ensures the next issued codes continue the sequence.
     */
    public static function syncStudentCounterFromExistingStudentCodes(string $organizationId): int
    {
        return (int) DB::transaction(function () use ($organizationId) {
            $maxSeq = self::maxStudentSequenceFromExistingCodes($organizationId);

            $counter = OrganizationCounter::lockForUpdate()
                ->where('organization_id', $organizationId)
                ->where('counter_type', OrganizationCounter::COUNTER_TYPE_STUDENTS)
                ->first();

            if (! $counter) {
                if ($maxSeq > 0) {
                    OrganizationCounter::create([
                        'organization_id' => $organizationId,
                        'counter_type' => OrganizationCounter::COUNTER_TYPE_STUDENTS,
                        'last_value' => $maxSeq,
                    ]);
                }

                return $maxSeq;
            }

            if ($counter->last_value < $maxSeq) {
                $counter->update(['last_value' => $maxSeq]);
            }

            return max($maxSeq, (int) $counter->refresh()->last_value);
        });
    }

    public static function generateStudentCodesBatch(string $organizationId, ?string $schoolId, int $count): array
    {
        if ($count <= 0) {
            return [];
        }

        $schoolIds = array_fill(0, $count, $schoolId);

        return self::allocateStudentCodesAfterSync($organizationId, $schoolIds);
    }

    /**
     * Generate a staff code for the given organization
     * Format: STF-{YY}-{000000}
     */
    public static function generateStaffCode(string $organizationId): string
    {
        return self::generateCode(
            $organizationId,
            OrganizationCounter::COUNTER_TYPE_STAFF,
            'STF'
        );
    }

    /**
     * Generate an admission number for the given organization
     * Format: AD-{YY}-{000000}
     */
    public static function generateAdmissionNumber(string $organizationId): string
    {
        return self::generateCode(
            $organizationId,
            OrganizationCounter::COUNTER_TYPE_ADMISSIONS,
            'AD'
        );
    }

    /**
     * Generate a code for the given organization and counter type
     * Uses database transaction with lockForUpdate() for concurrency safety
     */
    private static function generateCode(string $organizationId, string $counterType, string $prefix, ?string $studentSchoolId = null): string
    {
        return DB::transaction(function () use ($organizationId, $counterType, $prefix, $studentSchoolId) {
            // Lock the counter row (or create if missing) for this organization and counter type
            $counter = OrganizationCounter::lockForUpdate()
                ->where('organization_id', $organizationId)
                ->where('counter_type', $counterType)
                ->first();

            if (! $counter) {
                // Create counter if it doesn't exist
                $counter = OrganizationCounter::create([
                    'organization_id' => $organizationId,
                    'counter_type' => $counterType,
                    'last_value' => 0,
                ]);
            }

            // Increment the counter
            $counter->increment('last_value');
            $counter->refresh();

            // Student ST-*: middle segment from current academic year name; other counters: two-digit year (legacy).
            $middle = $counterType === OrganizationCounter::COUNTER_TYPE_STUDENTS && $prefix === 'ST'
                ? self::studentCodeMiddleSegmentFromAcademicYear($organizationId, $studentSchoolId)
                : date('y');

            // Student codes use configurable padding (default: 4) to avoid overly long leading zeros.
            // Other counters keep legacy 6-digit padding for backward compatibility.
            if ($counterType === OrganizationCounter::COUNTER_TYPE_STUDENTS) {
                $sequence = self::formatStudentSequence((int) $counter->last_value);
            } else {
                $sequence = str_pad((string) $counter->last_value, 6, '0', STR_PAD_LEFT);
            }

            return "{$prefix}-{$middle}-{$sequence}";
        });
    }

    /**
     * Format student sequence with configurable zero padding.
     * Controlled by STUDENT_CODE_PADDING env (min 1, max 10), default 4.
     */
    private static function formatStudentSequence(int $value): string
    {
        $rawPadding = env('STUDENT_CODE_PADDING', '4');
        $padding = is_numeric($rawPadding) ? (int) $rawPadding : 4;
        $padding = max(1, min(10, $padding));

        return str_pad((string) $value, $padding, '0', STR_PAD_LEFT);
    }
}
