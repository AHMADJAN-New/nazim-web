<?php

namespace Tests\Unit;

use App\Services\Reports\ReportColumnWidthCalculator;
use Tests\TestCase;

class ReportColumnWidthCalculatorTest extends TestCase
{
    public function test_name_and_class_columns_get_more_width_than_roll_number(): void
    {
        $calculator = new ReportColumnWidthCalculator;

        $widths = $calculator->calculate(
            [
                ['key' => 'rollNumber', 'label' => 'Roll'],
                ['key' => 'studentName', 'label' => 'Name'],
                ['key' => 'fatherName', 'label' => 'Father'],
                ['key' => 'className', 'label' => 'Class'],
                ['key' => 'section', 'label' => 'Section'],
            ],
            [],
            [
                [
                    'rollNumber' => '12',
                    'studentName' => 'احمد الله محمدی',
                    'fatherName' => 'عبدالرحمن محمدی',
                    'className' => 'صنف دوازدهم',
                    'section' => 'الف',
                ],
            ]
        );

        $this->assertCount(5, $widths);
        $this->assertEqualsWithDelta(100.0, array_sum($widths), 0.2);

        // Text columns should be wider than the short roll number column
        $this->assertGreaterThan($widths[0], $widths[1]);
        $this->assertGreaterThan($widths[0], $widths[2]);
        $this->assertGreaterThan($widths[0], $widths[3]);
    }

    public function test_collect_rows_includes_multi_section_rows(): void
    {
        $calculator = new ReportColumnWidthCalculator;

        $rows = $calculator->collectRowsForSizing(
            [['name' => 'A']],
            [
                'sections' => [
                    ['rows' => [['name' => 'Very Long Student Name For Width']]],
                ],
            ]
        );

        $this->assertCount(2, $rows);
        $this->assertSame('Very Long Student Name For Width', $rows[1]['name']);
    }
}
