<?php

namespace Tests\Unit;

use App\Jobs\GenerateReportJob;
use App\Services\Reports\DateConversionService;
use App\Services\Reports\ExcelReportService;
use App\Services\Reports\ReportConfig;
use App\Services\Storage\FileStorageService;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use Tests\TestCase;

class ReportTableFormattingTest extends TestCase
{
    public function test_build_context_clamps_table_font_size_to_14px_for_small_report_fonts(): void
    {
        $context = $this->buildReportContext('11px');

        $this->assertSame('11px', $context['FONT_SIZE']);
        $this->assertSame('14px', $context['TABLE_FONT_SIZE']);
    }

    public function test_build_context_preserves_larger_table_font_sizes(): void
    {
        $context = $this->buildReportContext('16px');

        $this->assertSame('16px', $context['FONT_SIZE']);
        $this->assertSame('16px', $context['TABLE_FONT_SIZE']);
    }

    public function test_a3_landscape_template_no_longer_renders_tiny_table_fonts(): void
    {
        $rendered = view('reports.table_a3_landscape', [
            'FONT_FAMILY' => 'Bahij Nassim',
            'FONT_SIZE' => '11px',
            'TABLE_FONT_SIZE' => '14px',
            'TABLE_TITLE' => 'Student Admissions',
            'COLUMNS' => [
                ['key' => 'name', 'label' => 'Name'],
                ['key' => 'status', 'label' => 'Status'],
            ],
            'ROWS' => [
                ['name' => 'Ahmad', 'status' => 'admitted'],
            ],
            'COL_WIDTHS' => [50, 50],
            'rtl' => true,
            'table_alternating_colors' => true,
        ])->render();

        $this->assertStringContainsString('font-size: 14px !important;', $rendered);
        $this->assertStringNotContainsString('font-size: 7px', $rendered);
        $this->assertStringNotContainsString('font-size: 8px', $rendered);
        $this->assertStringNotContainsString('font-size: 9px', $rendered);
    }

    public function test_excel_table_headers_and_rows_use_table_font_size_minimum(): void
    {
        $storage = $this->createMock(FileStorageService::class);
        $service = new ExcelReportService($storage);
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        $addTableSection = \Closure::bind(
            fn ($sheet, array $context, int $startRow) => $this->addTableSection($sheet, $context, $startRow),
            $service,
            $service
        );

        $addTableSection($sheet, [
            'COLUMNS' => [
                ['key' => 'name', 'label' => 'Name'],
            ],
            'ROWS' => [
                ['name' => 'Ahmad'],
            ],
            'PRIMARY_COLOR' => '#0b0b56',
            'SECONDARY_COLOR' => '#0056b3',
            'FONT_SIZE' => '11px',
            'TABLE_FONT_SIZE' => '14px',
            'table_alternating_colors' => true,
        ], 1);

        $this->assertSame(14, (int) $sheet->getStyle('A1')->getFont()->getSize());
        $this->assertSame(14, (int) $sheet->getStyle('A2')->getFont()->getSize());
        $this->assertTrue($sheet->getStyle('A1')->getAlignment()->getWrapText());
        $this->assertTrue($sheet->getStyle('A2')->getAlignment()->getWrapText());
    }

    private function buildReportContext(string $fontSize): array
    {
        $job = new GenerateReportJob('report-run-id', [], []);
        $buildContext = \Closure::bind(
            fn (
                ReportConfig $config,
                array $data,
                array $branding,
                array $layout,
                array $notes,
                ?array $watermark,
                DateConversionService $dateService
            ) => $this->buildContext($config, $data, $branding, $layout, $notes, $watermark, $dateService),
            $job,
            $job
        );

        return $buildContext(
            ReportConfig::fromArray([
                'report_key' => 'student_list',
                'report_type' => 'pdf',
                'title' => 'Student Admissions',
            ]),
            [
                'columns' => [
                    ['key' => 'name', 'label' => 'Name'],
                ],
                'rows' => [
                    ['name' => 'Ahmad'],
                ],
            ],
            [
                'report_font_size' => '12px',
            ],
            [
                'font_size' => $fontSize,
            ],
            [
                'header' => [],
                'body' => [],
                'footer' => [],
            ],
            null,
            new DateConversionService()
        );
    }
}
