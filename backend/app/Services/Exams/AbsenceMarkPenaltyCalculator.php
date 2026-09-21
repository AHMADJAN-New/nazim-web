<?php

namespace App\Services\Exams;

use App\Models\ExamAbsencePenaltyBand;
use App\Models\ExamAbsencePenaltySetting;
use App\Models\StudentAcademicYearAbsence;
use Illuminate\Support\Collection;

class AbsenceMarkPenaltyCalculator
{
    /**
     * Progressive absence penalty: each absence number i (1..N) is priced by the band containing i.
     *
     * @param  array<int, array{min_absences:int, max_absences:?int, marks_per_absence:float|int|string}>  $bands
     * @return array{
     *   enabled: bool,
     *   absence_count: int,
     *   marks_cut: float,
     *   total_raw: float,
     *   total_adjusted: float,
     *   percentage_adjusted: float
     * }
     */
    public function calculate(
        bool $enabled,
        array $bands,
        int $absenceCount,
        float $rawTotal,
        float $totalMaximum,
    ): array {
        $rawTotal = round($rawTotal, 2);

        if (! $enabled) {
            return $this->passthrough($rawTotal, $totalMaximum);
        }

        $absenceCount = max(0, $absenceCount);
        $sortedBands = $this->normalizeBands($bands);
        $marksCut = 0.0;

        for ($i = 1; $i <= $absenceCount; $i++) {
            $marksCut += $this->marksForAbsenceNumber($i, $sortedBands);
        }

        $marksCut = round($marksCut, 2);
        $marksCut = min($marksCut, $rawTotal);
        $adjusted = round($rawTotal - $marksCut, 2);
        $percentage = $totalMaximum > 0
            ? round(($adjusted / $totalMaximum) * 100, 2)
            : 0.0;

        return [
            'enabled' => true,
            'absence_count' => $absenceCount,
            'marks_cut' => $marksCut,
            'total_raw' => $rawTotal,
            'total_adjusted' => $adjusted,
            'percentage_adjusted' => $percentage,
        ];
    }

    /**
     * Load school settings/bands/absence counts and apply penalty for one student admission.
     *
     * @return array{
     *   enabled: bool,
     *   absence_count: int,
     *   marks_cut: float,
     *   total_raw: float,
     *   total_adjusted: float,
     *   percentage_adjusted: float
     * }
     */
    public function applyForAdmission(
        string $organizationId,
        string $schoolId,
        string $academicYearId,
        ?string $studentAdmissionId,
        float $rawTotal,
        float $totalMaximum,
        ?ExamAbsencePenaltySetting $setting = null,
        ?Collection $bands = null,
        ?int $absenceCount = null,
    ): array {
        $setting ??= ExamAbsencePenaltySetting::query()
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->first();

        $enabled = (bool) ($setting?->is_enabled);

        if (! $enabled) {
            return $this->passthrough($rawTotal, $totalMaximum);
        }

        $bands ??= ExamAbsencePenaltyBand::query()
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->orderBy('sort_order')
            ->orderBy('min_absences')
            ->get();

        if ($absenceCount === null) {
            $absenceCount = 0;
            if ($studentAdmissionId) {
                $absenceCount = (int) (StudentAcademicYearAbsence::query()
                    ->where('organization_id', $organizationId)
                    ->where('school_id', $schoolId)
                    ->where('academic_year_id', $academicYearId)
                    ->where('student_admission_id', $studentAdmissionId)
                    ->value('absence_count') ?? 0);
            }
        }

        $bandPayload = $bands->map(fn (ExamAbsencePenaltyBand $band) => [
            'min_absences' => (int) $band->min_absences,
            'max_absences' => $band->max_absences === null ? null : (int) $band->max_absences,
            'marks_per_absence' => (float) $band->marks_per_absence,
        ])->all();

        return $this->calculate(
            enabled: true,
            bands: $bandPayload,
            absenceCount: $absenceCount,
            rawTotal: $rawTotal,
            totalMaximum: $totalMaximum,
        );
    }

    /**
     * Prefetch setting, bands, and absence map for a batch of admissions (report hot path).
     *
     * @param  array<int, string|null>  $studentAdmissionIds
     * @return array{
     *   enabled: bool,
     *   bands: Collection<int, ExamAbsencePenaltyBand>,
     *   absences_by_admission: array<string, int>
     * }
     */
    public function loadContext(
        string $organizationId,
        string $schoolId,
        string $academicYearId,
        array $studentAdmissionIds,
    ): array {
        $setting = ExamAbsencePenaltySetting::query()
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->first();

        $enabled = (bool) ($setting?->is_enabled);

        if (! $enabled) {
            return [
                'enabled' => false,
                'bands' => collect(),
                'absences_by_admission' => [],
            ];
        }

        $bands = ExamAbsencePenaltyBand::query()
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->orderBy('sort_order')
            ->orderBy('min_absences')
            ->get();

        $ids = array_values(array_filter($studentAdmissionIds));
        $absencesByAdmission = [];

        if ($ids !== []) {
            $absencesByAdmission = StudentAcademicYearAbsence::query()
                ->where('organization_id', $organizationId)
                ->where('school_id', $schoolId)
                ->where('academic_year_id', $academicYearId)
                ->whereIn('student_admission_id', $ids)
                ->pluck('absence_count', 'student_admission_id')
                ->map(fn ($count) => (int) $count)
                ->all();
        }

        return [
            'enabled' => true,
            'bands' => $bands,
            'absences_by_admission' => $absencesByAdmission,
        ];
    }

    /**
     * @return array{
     *   enabled: bool,
     *   absence_count: int,
     *   marks_cut: float,
     *   total_raw: float,
     *   total_adjusted: float,
     *   percentage_adjusted: float
     * }
     */
    private function passthrough(float $rawTotal, float $totalMaximum): array
    {
        $rawTotal = round($rawTotal, 2);
        $percentage = $totalMaximum > 0
            ? round(($rawTotal / $totalMaximum) * 100, 2)
            : 0.0;

        return [
            'enabled' => false,
            'absence_count' => 0,
            'marks_cut' => 0.0,
            'total_raw' => $rawTotal,
            'total_adjusted' => $rawTotal,
            'percentage_adjusted' => $percentage,
        ];
    }

    /**
     * @param  array<int, array{min_absences:int, max_absences:?int, marks_per_absence:float|int|string}>  $bands
     * @return array<int, array{min_absences:int, max_absences:?int, marks_per_absence:float}>
     */
    private function normalizeBands(array $bands): array
    {
        $normalized = array_map(fn (array $band) => [
            'min_absences' => (int) $band['min_absences'],
            'max_absences' => array_key_exists('max_absences', $band) && $band['max_absences'] !== null
                ? (int) $band['max_absences']
                : null,
            'marks_per_absence' => (float) $band['marks_per_absence'],
        ], $bands);

        usort($normalized, function (array $a, array $b) {
            return $a['min_absences'] <=> $b['min_absences'];
        });

        return $normalized;
    }

    /**
     * @param  array<int, array{min_absences:int, max_absences:?int, marks_per_absence:float}>  $bands
     */
    private function marksForAbsenceNumber(int $absenceNumber, array $bands): float
    {
        foreach ($bands as $band) {
            if ($absenceNumber < $band['min_absences']) {
                continue;
            }

            if ($band['max_absences'] !== null && $absenceNumber > $band['max_absences']) {
                continue;
            }

            return $band['marks_per_absence'];
        }

        return 0.0;
    }
}
