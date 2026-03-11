<?php

namespace App\Services;

use App\Models\OrganizationCounter;
use Illuminate\Support\Facades\DB;

class CodeGenerator
{
    /**
     * Generate a student code for the given organization
 * Format: ST-{YY}-{SEQUENCE}
     * 
     * @param string $organizationId
     * @return string
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
     * Generate multiple student codes in a single counter transaction.
     *
     * @param string $organizationId
     * @param int $count
     * @return string[]
     */
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

            if (!$counter) {
                $counter = OrganizationCounter::create([
                    'organization_id' => $organizationId,
                    'counter_type' => OrganizationCounter::COUNTER_TYPE_STUDENTS,
                    'last_value' => 0,
                ]);
            }

            $start = ((int) $counter->last_value) + 1;
            $end = $start + $count - 1;
            $counter->update(['last_value' => $end]);

            $year = date('y');
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
     * 
     * @param string $organizationId
     * @return string
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
     *
     * @param string $organizationId
     * @return string
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
     * 
     * @param string $organizationId
     * @param string $counterType
     * @param string $prefix
     * @return string
     */
    private static function generateCode(string $organizationId, string $counterType, string $prefix): string
    {
        return DB::transaction(function () use ($organizationId, $counterType, $prefix) {
            // Lock the counter row (or create if missing) for this organization and counter type
            $counter = OrganizationCounter::lockForUpdate()
                ->where('organization_id', $organizationId)
                ->where('counter_type', $counterType)
                ->first();

            if (!$counter) {
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

            // Get current year (last 2 digits)
            $year = date('y'); // e.g., 25 for 2025

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

