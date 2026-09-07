<?php

namespace Tests\Unit;

use App\Services\Reports\StudentHistoryExcelSheets;
use App\Services\Reports\StudentHistoryReportLabels;
use PHPUnit\Framework\TestCase;

class StudentHistoryReportLabelsTest extends TestCase
{
    public function test_pashto_labels_are_not_english_defaults(): void
    {
        $labels = StudentHistoryReportLabels::forLanguage('ps');

        $this->assertSame('د زده کوونکي د ټول ژوند تاریخچه', $labels['reportTitle']);
        $this->assertSame('بشپړ نوم', $labels['fullName']);
        $this->assertSame('هو', $labels['yes']);
        $this->assertNotSame('Full Name', $labels['fullName']);
    }

    public function test_dari_and_arabic_labels_resolve(): void
    {
        $fa = StudentHistoryReportLabels::forLanguage('fa');
        $ar = StudentHistoryReportLabels::forLanguage('ar');

        $this->assertSame('تاریخچه کلی شاگرد', $fa['reportTitle']);
        $this->assertSame('السجل الكامل للطالب', $ar['reportTitle']);
        $this->assertTrue(StudentHistoryReportLabels::isRtl('fa'));
        $this->assertTrue(StudentHistoryReportLabels::isRtl('ps'));
        $this->assertFalse(StudentHistoryReportLabels::isRtl('en'));
    }

    public function test_unknown_language_falls_back_to_english(): void
    {
        $labels = StudentHistoryReportLabels::forLanguage('xx');

        $this->assertSame('Student Lifetime History', $labels['reportTitle']);
        $this->assertSame('Full Name', $labels['fullName']);
    }

    public function test_excel_sheets_use_translated_headers(): void
    {
        $labels = StudentHistoryReportLabels::forLanguage('ps');
        $sheets = StudentHistoryExcelSheets::build(
            ['fullName' => 'Ahmad', 'isOrphan' => true, 'admissionNumber' => 'A-1'],
            ['totalAcademicYears' => 2, 'attendanceRate' => 90, 'averageExamScore' => 80, 'outstandingFees' => 0],
            [],
            $labels
        );

        $this->assertSame('لنډیز', $sheets['overview']['sheet_name']);
        $this->assertSame('ساحه', $sheets['overview']['columns'][0]['label']);
        $this->assertSame('بشپړ نوم', $sheets['overview']['rows'][0]['field']);
        $this->assertSame('هو', $sheets['overview']['rows'][12]['value']); // Is Orphan
        $this->assertSame('داخلې', $sheets['admissions']['sheet_name']);
    }
}
