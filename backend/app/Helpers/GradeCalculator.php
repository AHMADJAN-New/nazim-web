<?php

namespace App\Helpers;

use App\Models\Grade;

class GradeCalculator
{
    /**
     * Calculate grade based on percentage
     *
     * @param float|null $percentage
     * @param string $organizationId
     * @return Grade|null
     */
    public static function calculateGrade(?float $percentage, string $organizationId): ?Grade
    {
        if ($percentage === null) {
            return null;
        }

        // Find the grade that matches the percentage
        // Uses inclusive boundaries: min_percentage <= percentage <= max_percentage
        $grade = Grade::where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->where('min_percentage', '<=', $percentage)
            ->where('max_percentage', '>=', $percentage)
            ->orderBy('order', 'desc')
            ->first();

        return $grade;
    }

    /**
     * Get grade name based on percentage
     *
     * @param float|null $percentage
     * @param string $organizationId
     * @param string|null $locale
     * @return string|null
     */
    public static function getGradeName(?float $percentage, string $organizationId, ?string $locale = null): ?string
    {
        $grade = self::calculateGrade($percentage, $organizationId);

        if (!$grade) {
            return null;
        }

        return $grade->getName($locale);
    }

    /**
     * Check if a percentage is passing based on grade system
     *
     * @param float|null $percentage
     * @param string $organizationId
     * @return bool|null Returns null if grade not found, otherwise boolean
     */
    public static function isPass(?float $percentage, string $organizationId): ?bool
    {
        if ($percentage === null) {
            return null;
        }

        $grade = self::calculateGrade($percentage, $organizationId);

        if (!$grade) {
            return null;
        }

        return $grade->is_pass;
    }

    /**
     * Get all grades for an organization ordered by order (descending)
     *
     * @param string $organizationId
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public static function getGrades(string $organizationId)
    {
        return Grade::where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->orderBy('order', 'desc')
            ->get();
    }

    /**
     * Calculate percentage from marks
     *
     * @param float|null $marksObtained
     * @param float|null $totalMarks
     * @return float|null
     */
    public static function calculatePercentage(?float $marksObtained, ?float $totalMarks): ?float
    {
        if ($marksObtained === null || $totalMarks === null || $totalMarks == 0) {
            return null;
        }

        return round(($marksObtained / $totalMarks) * 100, 2);
    }

    /**
     * Get grade details for a given percentage
     *
     * @param float|null $percentage
     * @param string $organizationId
     * @param string|null $locale
     * @return array|null Returns array with grade details or null if not found
     */
    public static function getGradeDetails(?float $percentage, string $organizationId, ?string $locale = null): ?array
    {
        $grade = self::calculateGrade($percentage, $organizationId);

        if (!$grade) {
            return null;
        }

        return [
            'id' => $grade->id,
            'name' => $grade->getName($locale),
            'name_en' => $grade->name_en,
            'name_ar' => $grade->name_ar,
            'name_ps' => $grade->name_ps,
            'name_fa' => $grade->name_fa,
            'min_percentage' => $grade->min_percentage,
            'max_percentage' => $grade->max_percentage,
            'order' => $grade->order,
            'is_pass' => $grade->is_pass,
        ];
    }
}
