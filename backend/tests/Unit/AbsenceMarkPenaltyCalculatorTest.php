<?php

namespace Tests\Unit;

use App\Services\Exams\AbsenceMarkPenaltyCalculator;
use PHPUnit\Framework\TestCase;

class AbsenceMarkPenaltyCalculatorTest extends TestCase
{
    private AbsenceMarkPenaltyCalculator $calculator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->calculator = new AbsenceMarkPenaltyCalculator;
    }

    public function test_disabled_passthrough_leaves_totals_unchanged(): void
    {
        $result = $this->calculator->calculate(
            enabled: false,
            bands: [
                ['min_absences' => 0, 'max_absences' => 4, 'marks_per_absence' => 0],
                ['min_absences' => 5, 'max_absences' => 9, 'marks_per_absence' => 3],
            ],
            absenceCount: 12,
            rawTotal: 400.0,
            totalMaximum: 400.0,
        );

        $this->assertFalse($result['enabled']);
        $this->assertSame(0, $result['absence_count']);
        $this->assertSame(0.0, $result['marks_cut']);
        $this->assertSame(400.0, $result['total_raw']);
        $this->assertSame(400.0, $result['total_adjusted']);
        $this->assertSame(100.0, $result['percentage_adjusted']);
    }

    public function test_zero_absences_cuts_nothing(): void
    {
        $result = $this->calculator->calculate(
            enabled: true,
            bands: [
                ['min_absences' => 0, 'max_absences' => 4, 'marks_per_absence' => 0],
                ['min_absences' => 5, 'max_absences' => 9, 'marks_per_absence' => 3],
            ],
            absenceCount: 0,
            rawTotal: 400.0,
            totalMaximum: 400.0,
        );

        $this->assertTrue($result['enabled']);
        $this->assertSame(0, $result['absence_count']);
        $this->assertSame(0.0, $result['marks_cut']);
        $this->assertSame(400.0, $result['total_adjusted']);
        $this->assertSame(100.0, $result['percentage_adjusted']);
    }

    public function test_progressive_bands_twelve_absences_cut_thirty(): void
    {
        // 0–4 = 0, 5–9 = 3, 10–15 = 5 → 4×0 + 5×3 + 3×5 = 30
        $result = $this->calculator->calculate(
            enabled: true,
            bands: [
                ['min_absences' => 0, 'max_absences' => 4, 'marks_per_absence' => 0],
                ['min_absences' => 5, 'max_absences' => 9, 'marks_per_absence' => 3],
                ['min_absences' => 10, 'max_absences' => 15, 'marks_per_absence' => 5],
            ],
            absenceCount: 12,
            rawTotal: 400.0,
            totalMaximum: 400.0,
        );

        $this->assertSame(12, $result['absence_count']);
        $this->assertSame(30.0, $result['marks_cut']);
        $this->assertSame(400.0, $result['total_raw']);
        $this->assertSame(370.0, $result['total_adjusted']);
        $this->assertSame(92.5, $result['percentage_adjusted']);
    }

    public function test_seven_absences_only_counts_absences_inside_penalty_band(): void
    {
        // 0–4 free, 5–10 at 3 → 4 free + 3×3 = 9
        $result = $this->calculator->calculate(
            enabled: true,
            bands: [
                ['min_absences' => 0, 'max_absences' => 4, 'marks_per_absence' => 0],
                ['min_absences' => 5, 'max_absences' => 10, 'marks_per_absence' => 3],
            ],
            absenceCount: 7,
            rawTotal: 400.0,
            totalMaximum: 400.0,
        );

        $this->assertSame(9.0, $result['marks_cut']);
        $this->assertSame(391.0, $result['total_adjusted']);
    }

    public function test_open_ended_last_band(): void
    {
        $result = $this->calculator->calculate(
            enabled: true,
            bands: [
                ['min_absences' => 0, 'max_absences' => 4, 'marks_per_absence' => 0],
                ['min_absences' => 5, 'max_absences' => null, 'marks_per_absence' => 2],
            ],
            absenceCount: 8,
            rawTotal: 100.0,
            totalMaximum: 100.0,
        );

        // absences 5,6,7,8 = 4×2 = 8
        $this->assertSame(8.0, $result['marks_cut']);
        $this->assertSame(92.0, $result['total_adjusted']);
    }

    public function test_cut_is_capped_at_raw_total(): void
    {
        $result = $this->calculator->calculate(
            enabled: true,
            bands: [
                ['min_absences' => 1, 'max_absences' => null, 'marks_per_absence' => 50],
            ],
            absenceCount: 5,
            rawTotal: 40.0,
            totalMaximum: 100.0,
        );

        $this->assertSame(40.0, $result['marks_cut']);
        $this->assertSame(0.0, $result['total_adjusted']);
        $this->assertSame(0.0, $result['percentage_adjusted']);
    }

    public function test_zero_maximum_yields_zero_percentage(): void
    {
        $result = $this->calculator->calculate(
            enabled: true,
            bands: [
                ['min_absences' => 0, 'max_absences' => 4, 'marks_per_absence' => 0],
            ],
            absenceCount: 2,
            rawTotal: 0.0,
            totalMaximum: 0.0,
        );

        $this->assertSame(0.0, $result['percentage_adjusted']);
    }

    public function test_absence_outside_any_band_costs_zero(): void
    {
        $result = $this->calculator->calculate(
            enabled: true,
            bands: [
                ['min_absences' => 0, 'max_absences' => 4, 'marks_per_absence' => 1],
            ],
            absenceCount: 6,
            rawTotal: 100.0,
            totalMaximum: 100.0,
        );

        // Only absences 1–4 match; 5–6 unmatched → 4×1 = 4
        $this->assertSame(4.0, $result['marks_cut']);
        $this->assertSame(96.0, $result['total_adjusted']);
    }
}
