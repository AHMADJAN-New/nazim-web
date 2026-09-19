<?php

namespace Tests\Unit;

use App\Helpers\GradeCalculator;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class GradeCalculatorTest extends TestCase
{
    public static function overallResultCases(): array
    {
        return [
            'passing total grade' => [false, ['is_pass' => true], 'Pass'],
            'failing total grade' => [false, ['is_pass' => false], 'Fail'],
            'unconfigured total grade' => [false, null, 'Fail'],
            'incomplete marks take precedence' => [true, ['is_pass' => true], 'Incomplete'],
        ];
    }

    #[DataProvider('overallResultCases')]
    public function test_overall_result_uses_the_total_percentage_grade(
        bool $hasIncompleteMarks,
        ?array $gradeDetails,
        string $expected
    ): void {
        $this->assertSame(
            $expected,
            GradeCalculator::determineOverallResult($hasIncompleteMarks, $gradeDetails)
        );
    }
}
