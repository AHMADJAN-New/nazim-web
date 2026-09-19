<?php

namespace Tests\Unit;

use App\Services\Reports\StudentHistoryExcelSheets;
use App\Services\Reports\StudentHistoryPdfPayload;
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

    public function test_known_enum_values_are_translated_for_pashto(): void
    {
        $labels = StudentHistoryReportLabels::forLanguage('ps');

        $this->assertSame($labels['valueActive'], StudentHistoryReportLabels::translateValue($labels, 'active'));
        $this->assertSame($labels['valuePending'], StudentHistoryReportLabels::translateValue($labels, 'pending'));
        $this->assertSame($labels['valueMale'], StudentHistoryReportLabels::translateValue($labels, 'male'));
        $this->assertSame($labels['valueAfghan'], StudentHistoryReportLabels::translateValue($labels, 'Afghan'));
        $this->assertSame($labels['valuePashto'], StudentHistoryReportLabels::translateValue($labels, 'Pashto'));
        $this->assertSame($labels['valueGuardian'], StudentHistoryReportLabels::translateValue($labels, 'guardian'));
        $this->assertNotSame('active', StudentHistoryReportLabels::translateValue($labels, 'active'));
    }

    public function test_unknown_and_empty_values_are_not_forced_into_english(): void
    {
        $labels = StudentHistoryReportLabels::forLanguage('ps');

        $this->assertSame('—', StudentHistoryReportLabels::translateValue($labels, null));
        $this->assertSame('—', StudentHistoryReportLabels::translateValue($labels, ''));
        $this->assertSame('Ahmad Jan', StudentHistoryReportLabels::translateValue($labels, 'Ahmad Jan'));
    }

    public function test_excel_overview_translates_enum_like_student_fields(): void
    {
        $labels = StudentHistoryReportLabels::forLanguage('ps');
        $sheets = StudentHistoryExcelSheets::build(
            [
                'fullName' => 'Ahmad',
                'gender' => 'male',
                'nationality' => 'Afghan',
                'preferredLanguage' => 'Pashto',
                'guardianRelation' => 'guardian',
                'status' => 'active',
                'admissionFeeStatus' => 'pending',
            ],
            [],
            [],
            $labels
        );

        $byField = [];
        foreach ($sheets['overview']['rows'] as $row) {
            $byField[$row['field']] = $row['value'];
        }

        $this->assertSame($labels['valueMale'], $byField[$labels['gender']]);
        $this->assertSame($labels['valueAfghan'], $byField[$labels['nationality']]);
        $this->assertSame($labels['valuePashto'], $byField[$labels['preferredLanguage']]);
        $this->assertSame($labels['valueGuardian'], $byField[$labels['guardianRelation']]);
        $this->assertSame($labels['valueActive'], $byField[$labels['status']]);
        $this->assertSame($labels['valuePending'], $byField[$labels['admissionFeeStatus']]);
    }

    public function test_attendance_summary_maps_service_camel_case_keys(): void
    {
        $mapped = StudentHistoryPdfPayload::mapAttendanceSummary([
            'totalRecords' => 12,
            'presentCount' => 10,
            'absentCount' => 1,
            'lateCount' => 1,
            'attendanceRate' => 91.67,
        ]);

        $this->assertSame(12, $mapped['total_days']);
        $this->assertSame(10, $mapped['present']);
        $this->assertSame(1, $mapped['absent']);
        $this->assertSame(1, $mapped['late']);
        $this->assertSame(91.67, $mapped['rate']);
    }

    public function test_student_history_ltr_css_keeps_table_cells(): void
    {
        $blade = file_get_contents(dirname(__DIR__, 2).'/resources/views/reports/student-history.blade.php');

        $this->assertIsString($blade);
        $this->assertDoesNotMatchRegularExpression('/\.ltr\s*\{[^}]*display:\s*inline-block/s', $blade);
        $this->assertMatchesRegularExpression('/\.data-table\s*\{[^}]*table-layout:\s*fixed/s', $blade);
        $this->assertMatchesRegularExpression('/td\.ltr[^{]*\{[^}]*display:\s*table-cell/s', $blade);
        $this->assertDoesNotMatchRegularExpression('/\.data-table\s+th:first-child/s', $blade);
        $this->assertDoesNotMatchRegularExpression('/th\.row-number[^{]*\{[^}]*max-width/s', $blade);
        $this->assertMatchesRegularExpression('/col\.col-num\s*\{[^}]*width:\s*42px/s', $blade);
    }

    public function test_every_student_history_data_table_starts_with_a_number_column(): void
    {
        $blade = file_get_contents(dirname(__DIR__, 2).'/resources/views/reports/student-history.blade.php');
        $this->assertIsString($blade);
        $this->assertStringContainsString('<col class="col-num">', $blade);

        preg_match_all(
            '/<table class="data-table"[^>]*>\s*(?:\{!! \$numColgroup !!\}\s*)?<thead>\s*<tr>\s*<th[^>]*>\s*#/s',
            $blade,
            $numbered
        );
        preg_match_all('/<table class="data-table"/s', $blade, $allTables);
        preg_match_all('/<table class="data-table"[^>]*>\s*\{!! \$numColgroup !!\}/s', $blade, $withColgroup);

        $this->assertGreaterThan(5, count($allTables[0]));
        $this->assertSame(
            count($allTables[0]),
            count($numbered[0]),
            'Every .data-table must start with a # numbering column so label headers are not crushed.'
        );
        $this->assertSame(
            count($allTables[0]),
            count($withColgroup[0]),
            'Every .data-table must include a numbering colgroup so table-layout:fixed reserves the # column.'
        );
    }
}
