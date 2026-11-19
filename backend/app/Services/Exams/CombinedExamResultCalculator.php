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
 * combined_obtained is set only when BOTH exams have a real mark for the
 * subject. A missing mark, an absent flag, or a subject/student that is not
 * on one of the exams leaves combined_obtained null. A one-sided number is
 * never presented as the combined score.
 *
 * The subject is complete only when both marks, both totals, and both passing
 * marks are present. Then:
 *
 *   pass when combined_obtained >= combined_passing
 *   fail otherwise
 *
 * If any subject on the card is incomplete, the official grand total is null
 * and the overall result is Incomplete. A partial sum is not the final total.
 *
 * The attendance absence penalty (a whole-exam deduction) is not applied here.
 * Only stored exam_results.marks_obtained values are summed.
 */
class CombinedExamResultCalculator
{
    public const FORMULA = 'combined_total = total_marks_a + total_marks_b; combined_passing = passing_marks_a + passing_marks_b; pass when combined_obtained >= combined_passing; a missing or absent mark leaves combined_obtained null';

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

        $combinedTotal = ($a['total_marks'] !== null && $b['total_marks'] !== null)
            ? round($a['total_marks'] + $b['total_marks'], 2)
            : null;
        $combinedPassing = ($a['passing_marks'] !== null && $b['passing_marks'] !== null)
            ? round($a['passing_marks'] + $b['passing_marks'], 2)
            : null;

        $marksReady = $a['enrolled'] && $b['enrolled']
            && ! $a['is_absent'] && ! $b['is_absent']
            && $a['marks_obtained'] !== null && $b['marks_obtained'] !== null;

        $combinedObtained = $marksReady
            ? round($a['marks_obtained'] + $b['marks_obtained'], 2)
            : null;

        $isComplete = $marksReady && $combinedTotal !== null && $combinedPassing !== null;
        $isPass = null;
        if ($isComplete && $combinedObtained !== null && $combinedPassing !== null) {
            $isPass = $combinedObtained >= $combinedPassing;
        }

        return [
            'exam_a' => $this->publicSide($a),
            'exam_b' => $this->publicSide($b),
            'combined_obtained' => $combinedObtained,
            'combined_total' => $combinedTotal,
            'combined_passing' => $combinedPassing,
            'is_pass' => $isPass,
            'is_complete' => $isComplete,
            'incomplete_reasons' => $isComplete ? [] : $reasons,
        ];
    }

    /**
     * Official grand total only when every subject is complete.
     * Incomplete dominates Fail: a missing mark is not declared a failure.
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
        $allComplete = $subjects !== [];

        foreach ($subjects as $subject) {
            if (! empty($subject['is_complete'])) {
                if (($subject['is_pass'] ?? null) === true) {
                    $passed++;
                } elseif (($subject['is_pass'] ?? null) === false) {
                    $failed++;
                }
                $obtained += (float) $subject['combined_obtained'];
                $maximum += (float) $subject['combined_total'];
                $passing += (float) $subject['combined_passing'];
            } else {
                $incomplete++;
                $allComplete = false;
            }
        }

        if (! $allComplete) {
            return [
                'total_subjects' => count($subjects),
                'passed_subjects' => $passed,
                'failed_subjects' => $failed,
                'incomplete_subjects' => $incomplete,
                'combined_obtained' => null,
                'combined_total' => null,
                'combined_passing' => null,
                'overall_percentage' => null,
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
