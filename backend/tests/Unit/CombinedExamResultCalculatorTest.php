<?php

namespace Tests\Unit;

use App\Services\Exams\CombinedExamResultCalculator;
use PHPUnit\Framework\TestCase;

class CombinedExamResultCalculatorTest extends TestCase
{
    private CombinedExamResultCalculator $calculator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->calculator = new CombinedExamResultCalculator;
    }

    public function test_afghanistan_example_sums_totals_and_passing_marks_and_passes_at_threshold(): void
    {
        // Example of the rule, not a hardcoded school default:
        // mid 40 / passing 16 + final 60 / passing 24 = combined 100 / passing 40.
        $row = $this->calculator->combineSubject(
            $this->side(marks: 16, total: 40, passing: 16),
            $this->side(marks: 24, total: 60, passing: 24),
        );

        $this->assertSame(40.0, $row['combined_obtained']);
        $this->assertSame(100.0, $row['combined_total']);
        $this->assertSame(40.0, $row['combined_passing']);
        $this->assertTrue($row['is_pass']);
        $this->assertTrue($row['is_complete']);
        $this->assertSame([], $row['incomplete_reasons']);
    }

    public function test_one_mark_below_summed_threshold_fails(): void
    {
        $row = $this->calculator->combineSubject(
            $this->side(marks: 15, total: 40, passing: 16),
            $this->side(marks: 24, total: 60, passing: 24),
        );

        $this->assertSame(39.0, $row['combined_obtained']);
        $this->assertSame(40.0, $row['combined_passing']);
        $this->assertFalse($row['is_pass']);
        $this->assertTrue($row['is_complete']);
    }

    public function test_other_exam_totals_use_the_same_sum_formula(): void
    {
        $row = $this->calculator->combineSubject(
            $this->side(marks: 20, total: 50, passing: 20),
            $this->side(marks: 20, total: 50, passing: 20),
        );

        $this->assertSame(40.0, $row['combined_obtained']);
        $this->assertSame(100.0, $row['combined_total']);
        $this->assertSame(40.0, $row['combined_passing']);
        $this->assertTrue($row['is_pass']);
    }

    public function test_missing_mark_does_not_invent_a_combined_score(): void
    {
        $row = $this->calculator->combineSubject(
            $this->side(marks: 30, total: 40, passing: 16),
            $this->side(marks: null, total: 60, passing: 24),
        );

        $this->assertNull($row['combined_obtained']);
        $this->assertNull($row['is_pass']);
        $this->assertFalse($row['is_complete']);
        $this->assertSame(100.0, $row['combined_total']);
        $this->assertSame(40.0, $row['combined_passing']);
        $this->assertTrue($row['exam_b']['missing_mark']);
        $this->assertContains('missing_mark_b', $row['incomplete_reasons']);
    }

    public function test_absent_mark_is_treated_as_missing(): void
    {
        $row = $this->calculator->combineSubject(
            $this->side(marks: 40, total: 40, passing: 16),
            $this->side(marks: 0, total: 60, passing: 24, absent: true),
        );

        $this->assertNull($row['combined_obtained']);
        $this->assertNull($row['exam_b']['marks_obtained']);
        $this->assertTrue($row['exam_b']['is_absent']);
        $this->assertFalse($row['is_complete']);
        $this->assertContains('absent_b', $row['incomplete_reasons']);
    }

    public function test_summary_stays_incomplete_when_any_subject_is_missing_a_mark(): void
    {
        $complete = $this->calculator->combineSubject(
            $this->side(marks: 16, total: 40, passing: 16),
            $this->side(marks: 24, total: 60, passing: 24),
        );
        $missing = $this->calculator->combineSubject(
            $this->side(marks: 10, total: 40, passing: 16),
            $this->side(marks: null, total: 60, passing: 24),
        );

        $summary = $this->calculator->summarize([$complete, $missing]);

        $this->assertSame('Incomplete', $summary['overall_result']);
        $this->assertNull($summary['combined_obtained']);
        $this->assertNull($summary['combined_total']);
        $this->assertSame(1, $summary['incomplete_subjects']);
        $this->assertFalse($summary['is_complete']);
    }

    public function test_summary_fails_when_every_subject_is_complete_and_one_is_below_threshold(): void
    {
        $pass = $this->calculator->combineSubject(
            $this->side(marks: 20, total: 40, passing: 16),
            $this->side(marks: 30, total: 60, passing: 24),
        );
        $fail = $this->calculator->combineSubject(
            $this->side(marks: 10, total: 40, passing: 16),
            $this->side(marks: 10, total: 60, passing: 24),
        );

        $summary = $this->calculator->summarize([$pass, $fail]);

        $this->assertSame('Fail', $summary['overall_result']);
        $this->assertSame(70.0, $summary['combined_obtained']);
        $this->assertSame(200.0, $summary['combined_total']);
        $this->assertSame(80.0, $summary['combined_passing']);
        $this->assertSame(1, $summary['failed_subjects']);
    }

    /**
     * @return array<string, mixed>
     */
    private function side(mixed $marks, mixed $total, mixed $passing, bool $absent = false, bool $enrolled = true): array
    {
        return [
            'enrolled' => $enrolled,
            'is_absent' => $absent,
            'marks_obtained' => $marks,
            'total_marks' => $total,
            'passing_marks' => $passing,
        ];
    }
}
