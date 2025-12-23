<?php

namespace App\Services\Reports;

use App\Models\ReportRun;
use App\Models\SchoolBranding;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Central report generation orchestrator
 */
class ReportService
{
    public function __construct(
        private BrandingCacheService $brandingCache,
        private PdfReportService $pdfService,
        private ExcelReportService $excelService,
    ) {}

    /**
     * Generate a report based on configuration
     *
     * @param ReportConfig $config Report configuration
     * @param array $data Report data (columns, rows, etc.)
     * @param string|null $organizationId Organization ID
     * @return ReportRun The report run record
     */
    public function generateReport(
        ReportConfig $config,
        array $data,
        ?string $organizationId = null
    ): ReportRun {
        $startTime = microtime(true);

        // Create report run record
        $reportRun = $this->createReportRun($config, $data, $organizationId);

        try {
            // Mark as processing
            $reportRun->markProcessing();

            // Load branding data
            $branding = $this->loadBranding($config);
            $reportRun->updateProgress(10, 'Loaded branding data');

            // Load layout configuration
            $layout = $this->loadLayout($config);
            $reportRun->updateProgress(20, 'Loaded layout configuration');

            // Load notes
            $notes = $this->loadNotes($config, $branding);
            $reportRun->updateProgress(30, 'Loaded notes');

            // Load watermark
            $watermark = $this->loadWatermark($config, $branding);
            $reportRun->updateProgress(40, 'Loaded watermark');

            // Build context for template
            $context = $this->buildContext($config, $data, $branding, $layout, $notes, $watermark);
            $reportRun->updateProgress(50, 'Built template context');

            // Generate the report
            if ($config->isPdf()) {
                $result = $this->pdfService->generate($config, $context, function ($progress, $message) use ($reportRun) {
                    $reportRun->updateProgress(50 + ($progress * 0.4), $message);
                });
            } else {
                $result = $this->excelService->generate($config, $context, function ($progress, $message) use ($reportRun) {
                    $reportRun->updateProgress(50 + ($progress * 0.4), $message);
                });
            }

            $reportRun->updateProgress(95, 'Report generated');

            // Calculate duration
            $durationMs = (int) ((microtime(true) - $startTime) * 1000);

            // Mark as completed
            $reportRun->markCompleted(
                outputPath: $result['path'],
                fileName: $result['filename'],
                fileSize: $result['size'],
                durationMs: $durationMs
            );

            return $reportRun;

        } catch (\Exception $e) {
            $durationMs = (int) ((microtime(true) - $startTime) * 1000);
            $reportRun->markFailed($e->getMessage(), $durationMs);

            \Log::error('Report generation failed', [
                'report_run_id' => $reportRun->id,
                'config' => $config->toArray(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }

    /**
     * Get report run by ID
     */
    public function getReportRun(string $id): ?ReportRun
    {
        return ReportRun::find($id);
    }

    /**
     * Get download path for a completed report
     */
    public function getDownloadPath(string $reportRunId): ?string
    {
        $reportRun = ReportRun::find($reportRunId);

        if (!$reportRun || !$reportRun->isCompleted() || !$reportRun->output_path) {
            return null;
        }

        return $reportRun->output_path;
    }

    /**
     * Delete old report runs and their files
     */
    public function cleanupOldReports(int $daysOld = 7): int
    {
        $cutoff = now()->subDays($daysOld);

        $oldReports = ReportRun::where('created_at', '<', $cutoff)->get();

        $count = 0;
        foreach ($oldReports as $report) {
            if ($report->output_path && Storage::exists($report->output_path)) {
                Storage::delete($report->output_path);
            }
            $report->delete();
            $count++;
        }

        return $count;
    }

    /**
     * Create a report run record
     */
    private function createReportRun(ReportConfig $config, array $data, ?string $organizationId): ReportRun
    {
        return ReportRun::create([
            'organization_id' => $organizationId,
            'branding_id' => $config->brandingId,
            'layout_id' => $config->layoutId,
            'user_id' => Auth::id(),
            'report_key' => $config->reportKey,
            'report_type' => $config->reportType,
            'template_name' => $config->templateName,
            'title' => $config->title,
            'parameters' => $config->parameters,
            'column_config' => $config->columnConfig,
            'row_count' => count($data['rows'] ?? []),
            'generated_by' => $config->generatedBy,
            'status' => ReportRun::STATUS_PENDING,
            'progress' => 0,
        ]);
    }

    /**
     * Load branding data
     */
    private function loadBranding(ReportConfig $config): array
    {
        if (!$config->brandingId) {
            return $this->getDefaultBranding();
        }

        $branding = $this->brandingCache->getBranding($config->brandingId);

        if (!$branding) {
            return $this->getDefaultBranding();
        }

        return $branding;
    }

    /**
     * Load layout configuration
     */
    private function loadLayout(ReportConfig $config): array
    {
        if ($config->layoutId) {
            $layout = $this->brandingCache->getLayout($config->layoutId);
            if ($layout) {
                return $layout;
            }
        }

        if ($config->brandingId) {
            $layout = $this->brandingCache->getDefaultLayout($config->brandingId);
            if ($layout) {
                return $layout;
            }
        }

        return [
            'page_size' => $config->getPageSize(),
            'orientation' => $config->getOrientation(),
            'margins' => '15mm 12mm 18mm 12mm',
            'rtl' => true,
            'show_primary_logo' => true,
            'show_secondary_logo' => true,
            'show_ministry_logo' => false,
            'logo_height_px' => 60,
            'header_height_px' => 100,
            'header_layout_style' => 'three-column',
        ];
    }

    /**
     * Load notes for the report
     */
    private function loadNotes(ReportConfig $config, array $branding): array
    {
        if ($config->notesMode === 'none') {
            return ['header' => [], 'body' => [], 'footer' => []];
        }

        if (!$config->brandingId) {
            return ['header' => [], 'body' => [], 'footer' => []];
        }

        $format = $config->isPdf() ? 'pdf' : 'excel';
        return $this->brandingCache->getNotes($config->brandingId, $config->reportKey, $format);
    }

    /**
     * Load watermark configuration
     */
    private function loadWatermark(ReportConfig $config, array $branding): ?array
    {
        if ($config->watermarkMode === 'none') {
            return null;
        }

        if (!$config->brandingId) {
            return null;
        }

        return $this->brandingCache->getWatermark($config->brandingId, $config->reportKey);
    }

    /**
     * Build template context
     */
    private function buildContext(
        ReportConfig $config,
        array $data,
        array $branding,
        array $layout,
        array $notes,
        ?array $watermark
    ): array {
        $columns = $data['columns'] ?? [];
        $rows = $data['rows'] ?? [];

        // Auto-select template if not specified
        $templateName = $config->autoSelectTemplate(count($columns));

        // Calculate column widths
        $columnWidths = $this->calculateColumnWidths($columns, $config);

        return [
            // Branding
            'SCHOOL_NAME' => $branding['school_name'] ?? '',
            'SCHOOL_NAME_EN' => $branding['school_name'] ?? '',
            'SCHOOL_NAME_PASHTO' => $branding['school_name_pashto'] ?? $branding['school_name'] ?? '',
            'SCHOOL_NAME_ARABIC' => $branding['school_name_arabic'] ?? $branding['school_name'] ?? '',
            'SCHOOL_ADDRESS' => $branding['school_address'] ?? '',
            'SCHOOL_PHONE' => $branding['school_phone'] ?? '',
            'SCHOOL_EMAIL' => $branding['school_email'] ?? '',
            'SCHOOL_WEBSITE' => $branding['school_website'] ?? '',
            'PRIMARY_COLOR' => $branding['primary_color'] ?? '#0b0b56',
            'SECONDARY_COLOR' => $branding['secondary_color'] ?? '#0056b3',
            'ACCENT_COLOR' => $branding['accent_color'] ?? '#ff6b35',
            'FONT_FAMILY' => $branding['font_family'] ?? 'Bahij Nassim',
            'FONT_SIZE' => $branding['report_font_size'] ?? '12px',

            // Logos
            'PRIMARY_LOGO_URI' => $branding['primary_logo_uri'] ?? null,
            'SECONDARY_LOGO_URI' => $branding['secondary_logo_uri'] ?? null,
            'MINISTRY_LOGO_URI' => $branding['ministry_logo_uri'] ?? null,
            'show_primary_logo' => $layout['show_primary_logo'] ?? $branding['show_primary_logo'] ?? true,
            'show_secondary_logo' => $layout['show_secondary_logo'] ?? $branding['show_secondary_logo'] ?? true,
            'show_ministry_logo' => $layout['show_ministry_logo'] ?? $branding['show_ministry_logo'] ?? false,

            // Layout
            'page_size' => $layout['page_size'] ?? 'A4',
            'orientation' => $layout['orientation'] ?? 'portrait',
            'margins' => $layout['margins'] ?? '15mm 12mm 18mm 12mm',
            'rtl' => $layout['rtl'] ?? true,
            'logo_height_px' => $layout['logo_height_px'] ?? 60,
            'header_height_px' => $layout['header_height_px'] ?? 100,
            'header_layout_style' => $layout['header_layout_style'] ?? 'three-column',
            'header_html' => $layout['header_html'] ?? null,
            'footer_html' => $layout['footer_html'] ?? null,
            'extra_css' => $layout['extra_css'] ?? null,

            // Report settings
            'table_alternating_colors' => $branding['table_alternating_colors'] ?? true,
            'show_page_numbers' => $branding['show_page_numbers'] ?? true,
            'show_generation_date' => $branding['show_generation_date'] ?? true,

            // Report data
            'COLUMNS' => $columns,
            'ROWS' => $rows,
            'TABLE_TITLE' => $config->title,
            'COL_WIDTHS' => $columnWidths,
            'COLUMN_CONFIG' => $config->columnConfig,

            // Notes
            'NOTES_HEADER' => $notes['header'] ?? [],
            'NOTES_BODY' => $notes['body'] ?? [],
            'NOTES_FOOTER' => $notes['footer'] ?? [],

            // Watermark
            'WATERMARK' => $watermark,

            // Date/time
            'CURRENT_DATE' => now()->format('Y-m-d'),
            'CURRENT_TIME' => now()->format('H:i'),
            'CURRENT_DATETIME' => now()->format('Y-m-d H:i'),

            // Template
            'template_name' => $templateName,

            // Parameters
            'parameters' => $config->parameters,
        ];
    }

    /**
     * Calculate column widths
     */
    private function calculateColumnWidths(array $columns, ReportConfig $config): array
    {
        $columnConfig = $config->columnConfig;
        $widths = [];

        foreach ($columns as $index => $column) {
            $key = is_array($column) ? ($column['key'] ?? $index) : $index;

            if (isset($columnConfig[$key]['width'])) {
                $widths[] = $columnConfig[$key]['width'];
            } else {
                // Auto width based on column count
                $totalColumns = count($columns);
                $widths[] = round(100 / $totalColumns, 2);
            }
        }

        return $widths;
    }

    /**
     * Get default branding settings
     */
    private function getDefaultBranding(): array
    {
        return [
            'school_name' => 'School Name',
            'school_name_pashto' => '',
            'school_name_arabic' => '',
            'school_address' => '',
            'school_phone' => '',
            'school_email' => '',
            'school_website' => '',
            'primary_color' => '#0b0b56',
            'secondary_color' => '#0056b3',
            'accent_color' => '#ff6b35',
            'font_family' => 'Bahij Nassim',
            'report_font_size' => '12px',
            'primary_logo_uri' => null,
            'secondary_logo_uri' => null,
            'ministry_logo_uri' => null,
            'show_primary_logo' => false,
            'show_secondary_logo' => false,
            'show_ministry_logo' => false,
            'table_alternating_colors' => true,
            'show_page_numbers' => true,
            'show_generation_date' => true,
        ];
    }
}
