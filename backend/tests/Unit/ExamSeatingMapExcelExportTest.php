<?php

namespace Tests\Unit;

use App\Services\ExamSeating\ExamSeatingMapService;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ExamSeatingMapExcelExportTest extends TestCase
{
    #[Test]
    public function student_list_sheet_keeps_seat_and_roll_in_separate_columns(): void
    {
        $service = app(ExamSeatingMapService::class);

        $sheets = $service->buildExcelExportSheets([
            'map' => [
                'name' => 'Hall A',
                'rows' => 1,
                'columns' => 2,
            ],
            'grid' => [
                'rows' => 1,
                'columns' => 2,
                'cells' => [
                    [
                        'row_number' => 1,
                        'column_number' => 1,
                        'seat_number' => 12,
                        'is_disabled' => false,
                        'exam_student_id' => 'es-1',
                        'admission_no' => 'A-100',
                        'exam_roll_number' => '2001',
                        'student_name' => 'Ahmad',
                        'father_name' => 'Karim',
                        'class_name' => '10A',
                        'color_hex' => '#AABBCC',
                    ],
                    [
                        'row_number' => 1,
                        'column_number' => 2,
                        'seat_number' => 13,
                        'is_disabled' => false,
                        'exam_student_id' => 'es-2',
                        'admission_no' => 'A-101',
                        'exam_roll_number' => null,
                        'student_name' => 'Bilal',
                        'father_name' => 'Omar',
                        'class_name' => '10A',
                        'color_hex' => '#AABBCC',
                    ],
                ],
            ],
            'filters' => [
                'map_name' => 'Hall A',
            ],
        ], 'Hall A Map');

        $this->assertCount(2, $sheets);

        $listSheet = $sheets[1];
        $this->assertSame('Student List', $listSheet['sheet_name']);
        $this->assertSame('table', $listSheet['type']);

        $columnKeys = array_column($listSheet['columns'], 'key');
        $columnLabels = array_column($listSheet['columns'], 'label');

        $this->assertContains('seat_number', $columnKeys);
        $this->assertContains('exam_roll_number', $columnKeys);
        $this->assertNotContains('Seat / Roll', $columnLabels);
        $this->assertContains('Seat #', $columnLabels);
        $this->assertContains('Roll #', $columnLabels);

        $this->assertCount(2, $listSheet['rows']);

        $first = $listSheet['rows'][0];
        $this->assertSame(12, $first['seat_number']);
        $this->assertSame('2001', $first['exam_roll_number']);
        $this->assertSame('A-100', $first['student_id']);

        $second = $listSheet['rows'][1];
        $this->assertSame(13, $second['seat_number']);
        $this->assertSame('', $second['exam_roll_number']);
        $this->assertArrayNotHasKey('_sort_seat', $second);
    }
}
