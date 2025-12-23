<?php

namespace App\Jobs;

use App\Models\ReportRun;
use App\Services\Reports\BrandingCacheService;
use App\Services\Reports\ExcelReportService;
use App\Services\Reports\PdfReportService;
use App\Services\Reports\ReportConfig;
use App\Services\Reports\ReportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class GenerateReportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     */
    public int $backoff = 30;

    /**
     * The number of seconds the job can run before timing out.
     */
    public int $timeout = 300;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public string $reportRunId,
        public array $configData,
        public array $reportData
    ) {}

    /**
     * Execute the job.
     */
    public function handle(
        BrandingCacheService $brandingCache,
        PdfReportService $pdfService,
        ExcelReportService $excelService
    ): void {
        $startTime = microtime(true);

        // Find the report run
        $reportRun = ReportRun::find($this->reportRunId);

        if (!$reportRun) {
            Log::error("Report run not found", ['report_run_id' => $this->reportRunId]);
            return;
        }

        // Create the report service
        $reportService = new ReportService($brandingCache, $pdfService, $excelService);

        try {
            // Mark as processing
            $reportRun->markProcessing();

            // Create config from data
            $config = ReportConfig::fromArray($this->configData);

            // Generate the report using the service
            // We need to manually handle the generation since we already have a report run
            $this->generateReport($reportRun, $config, $this->reportData, $brandingCache, $pdfService, $excelService, $startTime);

        } catch (\Exception $e) {
            $durationMs = (int) ((microtime(true) - $startTime) * 1000);
            $reportRun->markFailed($e->getMessage(), $durationMs);

            Log::error('Report generation job failed', [
                'report_run_id' => $this->reportRunId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Re-throw to trigger retry
            throw $e;
        }
    }

    /**
     * Generate the report
     */
    private function generateReport(
        ReportRun $reportRun,
        ReportConfig $config,
        array $data,
        BrandingCacheService $brandingCache,
        PdfReportService $pdfService,
        ExcelReportService $excelService,
        float $startTime
    ): void {
        // Load branding data
        $branding = $this->loadBranding($config, $brandingCache);
        $reportRun->updateProgress(10, 'Loaded branding data');

        // Load layout configuration
        $layout = $this->loadLayout($config, $brandingCache);
        $reportRun->updateProgress(20, 'Loaded layout configuration');

        // Load notes
        $notes = $this->loadNotes($config, $brandingCache);
        $reportRun->updateProgress(30, 'Loaded notes');

        // Load watermark
        $watermark = $this->loadWatermark($config, $brandingCache);
        $reportRun->updateProgress(40, 'Loaded watermark');

        // Build context for template
        $context = $this->buildContext($config, $data, $branding, $layout, $notes, $watermark);
        $reportRun->updateProgress(50, 'Built template context');

        // Generate the report
        if ($config->isPdf()) {
            $result = $pdfService->generate($config, $context, function ($progress, $message) use ($reportRun) {
                $reportRun->updateProgress(50 + ($progress * 0.4), $message);
            });
        } else {
            $result = $excelService->generate($config, $context, function ($progress, $message) use ($reportRun) {
                $reportRun->updateProgress(50 + ($progress * 0.4), $message);
            });
        }

        $reportRun->updateProgress(95, 'Report generated');

        // Calculate duration
        $durationMs = (int) ((microtime(true) - $startTime) * 1000);

        // Update the notes snapshot
        $reportRun->update([
            'notes_snapshot' => $notes,
            'page_settings' => [
                'page_size' => $context['page_size'],
                'orientation' => $context['orientation'],
                'margins' => $context['margins'],
            ],
        ]);

        // Mark as completed
        $reportRun->markCompleted(
            outputPath: $result['path'],
            fileName: $result['filename'],
            fileSize: $result['size'],
            durationMs: $durationMs
        );
    }

    /**
     * Load branding data
     */
    private function loadBranding(ReportConfig $config, BrandingCacheService $brandingCache): array
    {
        if (!$config->brandingId) {
            return $this->getDefaultBranding();
        }

        $branding = $brandingCache->getBranding($config->brandingId);

        if (!$branding) {
            return $this->getDefaultBranding();
        }

        return $branding;
    }

    /**
     * Load layout configuration
     */
    private function loadLayout(ReportConfig $config, BrandingCacheService $brandingCache): array
    {
        if ($config->layoutId) {
            $layout = $brandingCache->getLayout($config->layoutId);
            if ($layout) {
                return $layout;
            }
        }

        if ($config->brandingId) {
            $layout = $brandingCache->getDefaultLayout($config->brandingId);
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
    private function loadNotes(ReportConfig $config, BrandingCacheService $brandingCache): array
    {
        if ($config->notesMode === 'none' || !$config->brandingId) {
            return ['header' => [], 'body' => [], 'footer' => []];
        }

        $format = $config->isPdf() ? 'pdf' : 'excel';
        return $brandingCache->getNotes($config->brandingId, $config->reportKey, $format);
    }

    /**
     * Load watermark configuration
     */
    private function loadWatermark(ReportConfig $config, BrandingCacheService $brandingCache): ?array
    {
        if ($config->watermarkMode === 'none' || !$config->brandingId) {
            return null;
        }

        return $brandingCache->getWatermark($config->brandingId, $config->reportKey);
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

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        $reportRun = ReportRun::find($this->reportRunId);

        if ($reportRun) {
            $reportRun->markFailed("Job failed after {$this->tries} attempts: " . $exception->getMessage(), 0);
        }

        Log::error('Report generation job permanently failed', [
            'report_run_id' => $this->reportRunId,
            'error' => $exception->getMessage(),
        ]);
    }
}
