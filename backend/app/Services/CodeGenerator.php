<?php

namespace App\Services;

use App\Models\OrganizationCounter;
use Illuminate\Support\Facades\DB;

class CodeGenerator
{
    /**
     * Generate a student code for the given organization
     * Format: ST-{YY}-{000000}
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

            // Format: {PREFIX}-{YY}-{000000} (6-digit zero-padded sequence)
            $sequence = str_pad((string) $counter->last_value, 6, '0', STR_PAD_LEFT);

            return "{$prefix}-{$year}-{$sequence}";
        });
    }
}

