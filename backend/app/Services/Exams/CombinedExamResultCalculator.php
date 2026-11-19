<?php

namespace App\Services\Exams;

/**
 * Combines one student's subject marks from two exams.
 *
 * Formula (per class subject, using that exam subject's own configuration):
 *
 *   combined_total    = total_marks(exam A) + total_marks(exam B)
 *   combined_passing  = passing_marks(exam A) + passing_marks(exam B)
 *   combined_obtained = marks_obtained(exam A) + marks_obtained(exam B)
 *
 * passing_marks is the minimum mark required to pass that exam. In Afghan
 * education usage this is the "failing mark": a student fails when the
 * obtained mark is below it. The 40/16 and 60/24 papers (combined 100/40)
 * are an example of this rule, not fixed numbers.
 *
 * combined_obtained adds every exam that has a real mark. A missing mark, an
 * absent flag, or a subject the student is not enrolled in is left out of the
 * sum, and the other exam's mark is still calculated.
 *
 * When an exam status is completed or archived, the caller counts a missing
 * or absent subject as zero before combining, so that closed exam can finish.
 *
 * The subject is complete only when both marks, both totals, and both passing
 * marks are present. Then:
 *
 *   pass when combined_obtained >= combined_passing
 *   fail otherwise
 *
 * If any subject on the card is incomplete, the overall result stays
 * Incomplete, but the total still adds every subject that has a calculated
 * mark.
 *
 * Attendance absence penalties are applied afterwards by
 * CombinedExamResultCardService via applyAbsenceAdjustment(). This class only
 * sums stored exam_results.marks_obtained values.
 */
class CombinedExamResultCalculator
{
    public const FORMULA = 'combined_total = total_marks_a + total_marks_b; combined_passing = passing_marks_a + passing_marks_b; pass when combined_obtained >= combined_passing; a missing or absent side is skipped and the other side is still summed; on a completed exam a missing subject counts as zero';

    /**
     * A completed exam will not receive more marks. A missing or absent
     * subject on that exam counts as zero so the result can be finished.
     *
     * @param  array<string, mixed>  $side
     * @return array<string, mixed>
     */
    public function countMissingAsZero(array $side): array
    {
        if (empty($side['enrolled'])) {
            return $side;
        }

        if (! empty($side['is_absent']) || ($side['marks_obtained'] ?? null) === null) {
            $side['is_absent'] = false;
            $side['marks_obtained'] = 0;
        }

        return $side;
    }

    /**
     * @param  array<string, mixed>  $sideA
     * @param  array<string, mixed>  $sideB
     * @return array<string, mixed>
     */
    public function combineSubject(array $sideA, array $sideB): array
    {
        $a = $this->normalizeSide($sideA);
        $b = $this->normalizeSide($sideB);

        $reasons = [];
        if (! $a['enrolled']) {
            $reasons[] = 'not_enrolled_a';
        }
        if (! $b['enrolled']) {
            $reasons[] = 'not_enrolled_b';
        }
        if ($a['enrolled'] && $a['is_absent']) {
            $reasons[] = 'absent_a';
        }
        if ($b['enrolled'] && $b['is_absent']) {
            $reasons[] = 'absent_b';
        }
        if ($a['enrolled'] && ! $a['is_absent'] && $a['marks_obtained'] === null) {
            $reasons[] = 'missing_mark_a';
        }
        if ($b['enrolled'] && ! $b['is_absent'] && $b['marks_obtained'] === null) {
            $reasons[] = 'missing_mark_b';
        }
        if ($a['total_marks'] === null) {
            $reasons[] = 'missing_total_a';
        }
        if ($b['total_marks'] === null) {
            $reasons[] = 'missing_total_b';
        }
        if ($a['passing_marks'] === null) {
            $reasons[] = 'missing_passing_a';
        }
        if ($b['passing_marks'] === null) {
            $reasons[] = 'missing_passing_b';
        }

        $included = array_values(array_filter(
            [$a, $b],
            fn (array $side): bool => $side['enrolled'] && ! $side['is_absent'] && $side['marks_obtained'] !== null
        ));

        $combinedObtained = $included === []
            ? null
            : round(array_sum(array_column($included, 'marks_obtained')), 2);
        $includedTotals = array_values(array_filter(
            array_column($included, 'total_marks'),
            fn ($value): bool => $value !== null
        ));
        $includedPassing = array_values(array_filter(
            array_column($included, 'passing_marks'),
            fn ($value): bool => $value !== null
        ));
        $combinedTotal = $included !== [] && count($includedTotals) === count($included)
            ? round(array_sum($includedTotals), 2)
            : null;
        $combinedPassing = $included !== [] && count($includedPassing) === count($included)
            ? round(array_sum($includedPassing), 2)
            : null;

        $isComplete = $reasons === [] && $combinedObtained !== null && $combinedTotal !== null && $combinedPassing !== null;
        $isPass = null;
        if ($isComplete) {
            $isPass = $combinedObtained >= $combinedPassing;
        }

        $percentage = ($combinedObtained !== null && $combinedTotal !== null && $combinedTotal > 0)
            ? round(($combinedObtained / $combinedTotal) * 100, 2)
            : null;

        return [
            'exam_a' => $this->publicSide($a),
            'exam_b' => $this->publicSide($b),
            'combined_obtained' => $combinedObtained,
            'combined_total' => $combinedTotal,
            'combined_passing' => $combinedPassing,
            'percentage' => $percentage,
            'is_pass' => $isPass,
            'is_complete' => $isComplete,
            'incomplete_reasons' => $isComplete ? [] : $reasons,
        ];
    }

    /**
     * Subtract attendance marks cut from a complete combined total and
     * recalculate the overall percentage. An incomplete card keeps its partial
     * total; the absence figures are still attached when the penalty is on.
     *
     * @param  array<string, mixed>  $summary
     * @return array<string, mixed>
     */
    public function applyAbsenceAdjustment(array $summary, float $marksCut, int $absenceCount, bool $enabled): array
    {
        if (! $enabled) {
            return $summary;
        }

        $summary['absence_count'] = max(0, $absenceCount);
        $summary['marks_cut'] = round(max(0, $marksCut), 2);

        if (empty($summary['is_complete']) || $summary['combined_obtained'] === null || $summary['combined_total'] === null) {
            return $summary;
        }

        $raw = round((float) $summary['combined_obtained'], 2);
        $cut = min($summary['marks_cut'], $raw);
        $adjusted = round($raw - $cut, 2);
        $maximum = (float) $summary['combined_total'];

        $summary['combined_obtained_raw'] = $raw;
        $summary['marks_cut'] = $cut;
        $summary['combined_obtained'] = $adjusted;
        $summary['overall_percentage'] = $maximum > 0
            ? round(($adjusted / $maximum) * 100, 2)
            : null;

        return $summary;
    }

    /**
     * Adds every subject that has a calculated mark. A missing subject does
     * not erase the others. The result stays Incomplete until every subject
     * is complete, and Incomplete is not reported as a failure.
     *
     * @param  list<array<string, mixed>>  $subjects
     * @return array<string, mixed>
     */
    public function summarize(array $subjects): array
    {
        $passed = 0;
        $failed = 0;
        $incomplete = 0;
        $obtained = 0.0;
        $maximum = 0.0;
        $passing = 0.0;
        $scored = 0;
        $allComplete = $subjects !== [];

        foreach ($subjects as $subject) {
            if (($subject['combined_obtained'] ?? null) !== null && ($subject['combined_total'] ?? null) !== null) {
                $scored++;
                $obtained += (float) $subject['combined_obtained'];
                $maximum += (float) $subject['combined_total'];
                if (($subject['combined_passing'] ?? null) !== null) {
                    $passing += (float) $subject['combined_passing'];
                }
            }

            if (! empty($subject['is_complete'])) {
                if (($subject['is_pass'] ?? null) === true) {
                    $passed++;
                } elseif (($subject['is_pass'] ?? null) === false) {
                    $failed++;
                }
            } else {
                $incomplete++;
                $allComplete = false;
            }
        }

        if (! $allComplete) {
            $partialPercentage = $maximum > 0 ? round(($obtained / $maximum) * 100, 2) : null;

            return [
                'total_subjects' => count($subjects),
                'passed_subjects' => $passed,
                'failed_subjects' => $failed,
                'incomplete_subjects' => $incomplete,
                'combined_obtained' => $scored > 0 ? round($obtained, 2) : null,
                'combined_total' => $scored > 0 ? round($maximum, 2) : null,
                'combined_passing' => $scored > 0 ? round($passing, 2) : null,
                'overall_percentage' => $scored > 0 ? $partialPercentage : null,
                'overall_result' => 'Incomplete',
                'is_complete' => false,
            ];
        }

        $percentage = $maximum > 0 ? round(($obtained / $maximum) * 100, 2) : null;

        return [
            'total_subjects' => count($subjects),
            'passed_subjects' => $passed,
            'failed_subjects' => $failed,
            'incomplete_subjects' => 0,
            'combined_obtained' => round($obtained, 2),
            'combined_total' => round($maximum, 2),
            'combined_passing' => round($passing, 2),
            'overall_percentage' => $percentage,
            'overall_result' => $failed > 0 ? 'Fail' : 'Pass',
            'is_complete' => true,
        ];
    }

    /**
     * @param  array<string, mixed>  $side
     * @return array{enrolled: bool, is_absent: bool, marks_obtained: float|null, total_marks: float|null, passing_marks: float|null}
     */
    private function normalizeSide(array $side): array
    {
        $enrolled = (bool) ($side['enrolled'] ?? false);

        return [
            'enrolled' => $enrolled,
            'is_absent' => $enrolled && (bool) ($side['is_absent'] ?? false),
            'marks_obtained' => $enrolled ? $this->number($side['marks_obtained'] ?? null) : null,
            'total_marks' => $this->number($side['total_marks'] ?? null),
            'passing_marks' => $this->number($side['passing_marks'] ?? null),
        ];
    }

    /**
     * @param  array{enrolled: bool, is_absent: bool, marks_obtained: float|null, total_marks: float|null, passing_marks: float|null}  $side
     * @return array<string, mixed>
     */
    private function publicSide(array $side): array
    {
        $showMark = $side['enrolled'] && ! $side['is_absent'] ? $side['marks_obtained'] : null;

        return [
            'enrolled' => $side['enrolled'],
            'is_absent' => $side['is_absent'],
            'marks_obtained' => $showMark,
            'total_marks' => $side['total_marks'],
            'passing_marks' => $side['passing_marks'],
            'missing_mark' => $side['enrolled'] && ! $side['is_absent'] && $side['marks_obtained'] === null,
        ];
    }

    private function number(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_string($value)) {
            $value = trim($value);
            if ($value === '' || ! is_numeric($value)) {
                return null;
            }
        }

        if (! is_int($value) && ! is_float($value) && ! is_string($value)) {
            return null;
        }

        return round((float) $value, 2);
    }
}
