<?php

namespace App\Services;

use App\Models\OrganizationCounter;
use Illuminate\Support\Facades\DB;

class CodeGenerator
{
    /**
     * Generate a student code for the given organization.
     * Format: ST-{YYYY}-{SEQUENCE} (four-digit calendar year).
     */
    public static function generateStudentCode(string $organizationId): string
    {
        return self::generateCode(
            $organizationId,
            OrganizationCounter::COUNTER_TYPE_STUDENTS,
            'ST'
        );
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
     * Which student_code values would be issued next (same order as backfill), without writing DB.
     *
     * @return string[]
     */
    public static function previewStudentCodesAfterSync(string $organizationId, int $count): array
    {
        if ($count <= 0) {
            return [];
        }

        $maxSeq = self::maxStudentSequenceFromExistingCodes($organizationId);
        $counterLast = (int) DB::table('organization_counters')
            ->where('organization_id', $organizationId)
            ->where('counter_type', OrganizationCounter::COUNTER_TYPE_STUDENTS)
            ->value('last_value');
        $L = max($counterLast, $maxSeq);
        $year = date('Y');
        $codes = [];
        for ($n = 1; $n <= $count; $n++) {
            $seq = $L + $n;
            $codes[] = 'ST-'.$year.'-'.self::formatStudentSequence($seq);
        }

        return $codes;
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

    public static function generateStudentCodesBatch(string $organizationId, int $count): array
    {
        if ($count <= 0) {
            return [];
        }

        return DB::transaction(function () use ($organizationId, $count) {
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

            $start = ((int) $counter->last_value) + 1;
            $end = $start + $count - 1;
            $counter->update(['last_value' => $end]);

            $year = date('Y');
            $codes = [];
            for ($i = $start; $i <= $end; $i++) {
                $sequence = self::formatStudentSequence($i);
                $codes[] = "ST-{$year}-{$sequence}";
            }

            return $codes;
        });
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
    private static function generateCode(string $organizationId, string $counterType, string $prefix): string
    {
        return DB::transaction(function () use ($organizationId, $counterType, $prefix) {
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

            // Student codes: full calendar year (4 digits). Other counters: two-digit year (legacy).
            $year = $counterType === OrganizationCounter::COUNTER_TYPE_STUDENTS
                ? date('Y')
                : date('y');

            // Student codes use configurable padding (default: 4) to avoid overly long leading zeros.
            // Other counters keep legacy 6-digit padding for backward compatibility.
            if ($counterType === OrganizationCounter::COUNTER_TYPE_STUDENTS) {
                $sequence = self::formatStudentSequence((int) $counter->last_value);
            } else {
                $sequence = str_pad((string) $counter->last_value, 6, '0', STR_PAD_LEFT);
            }

            return "{$prefix}-{$year}-{$sequence}";
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
