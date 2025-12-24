<?php

namespace App\Jobs;

use App\Models\ReportRun;
use App\Models\ReportTemplate;
use App\Services\Reports\BrandingCacheService;
use App\Services\Reports\DateConversionService;
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
        ExcelReportService $excelService,
        DateConversionService $dateService
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
            $this->generateReport($reportRun, $config, $this->reportData, $brandingCache, $pdfService, $excelService, $dateService, $startTime);

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
        DateConversionService $dateService,
        float $startTime
    ): void {
        // Load branding data
        $branding = $this->loadBranding($config, $brandingCache);
        $reportRun->updateProgress(10, 'Loaded branding data');

        // Load layout configuration
        $layout = $this->loadLayout($config, $brandingCache);
        $reportRun->updateProgress(15, 'Loaded layout configuration');

        // Load ReportTemplate (custom header/footer) if specified
        $reportTemplate = $this->loadReportTemplate($config);
        $reportRun->updateProgress(20, 'Loaded report template');

        // Merge report template settings with layout
        $layout = $this->mergeReportTemplate($layout, $reportTemplate, $branding);
        $reportRun->updateProgress(25, 'Merged template settings');

        // Load notes
        $notes = $this->loadNotes($config, $brandingCache);
        $reportRun->updateProgress(30, 'Loaded notes');

        // Load watermark
        $watermark = $this->loadWatermark($config, $brandingCache);
        $reportRun->updateProgress(40, 'Loaded watermark');

        // Build context for template
        $context = $this->buildContext($config, $data, $branding, $layout, $notes, $watermark, $dateService);
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
     * Load ReportTemplate if specified
     */
    private function loadReportTemplate(ReportConfig $config): ?ReportTemplate
    {
        if (!$config->reportTemplateId) {
            return null;
        }

        return ReportTemplate::where('id', $config->reportTemplateId)
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->first();
    }

    /**
     * Merge ReportTemplate settings with layout
     * ReportTemplate overrides take precedence
     */
    private function mergeReportTemplate(array $layout, ?ReportTemplate $template, array $branding): array
    {
        if (!$template) {
            return $layout;
        }

        // Override header/footer HTML if provided by template
        if ($template->header_html) {
            $layout['header_html'] = $template->header_html;
        }
        if ($template->footer_html) {
            $layout['footer_html'] = $template->footer_html;
        }

        // Override header/footer text if provided
        if ($template->header_text) {
            $layout['header_text'] = $template->header_text;
        }
        if ($template->header_text_position) {
            $layout['header_text_position'] = $template->header_text_position;
        }
        if ($template->footer_text) {
            $layout['footer_text'] = $template->footer_text;
        }
        if ($template->footer_text_position) {
            $layout['footer_text_position'] = $template->footer_text_position;
        }

        // Override report settings if provided by template
        // Use individual boolean fields directly (like school branding)
        if ($template->show_primary_logo !== null) {
            $layout['show_primary_logo'] = $template->show_primary_logo;
        }
        if ($template->show_secondary_logo !== null) {
            $layout['show_secondary_logo'] = $template->show_secondary_logo;
        }
        if ($template->show_ministry_logo !== null) {
            $layout['show_ministry_logo'] = $template->show_ministry_logo;
        }
        
        // Override logo positions if provided by template
        if ($template->primary_logo_position !== null) {
            $layout['primary_logo_position'] = $template->primary_logo_position;
        }
        if ($template->secondary_logo_position !== null) {
            $layout['secondary_logo_position'] = $template->secondary_logo_position;
        }
        if ($template->ministry_logo_position !== null) {
            $layout['ministry_logo_position'] = $template->ministry_logo_position;
        }

        if ($template->show_page_numbers !== null) {
            $layout['show_page_numbers'] = $template->show_page_numbers;
        }

        if ($template->show_generation_date !== null) {
            $layout['show_generation_date'] = $template->show_generation_date;
        }

        if ($template->table_alternating_colors !== null) {
            $layout['table_alternating_colors'] = $template->table_alternating_colors;
        }

        if ($template->report_font_size) {
            $layout['font_size'] = $template->report_font_size;
        }

        return $layout;
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
        ?array $watermark,
        DateConversionService $dateService
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
            // CRITICAL: Use template font size from layout first, then branding fallback
            'FONT_SIZE' => $layout['font_size'] ?? $branding['report_font_size'] ?? '12px',

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

            // Report settings - CRITICAL: Use template settings from layout first, then branding fallback
            'table_alternating_colors' => $layout['table_alternating_colors'] ?? $branding['table_alternating_colors'] ?? true,
            'show_page_numbers' => $layout['show_page_numbers'] ?? $branding['show_page_numbers'] ?? true,
            'show_generation_date' => $layout['show_generation_date'] ?? $branding['show_generation_date'] ?? true,

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

            // Date/time with calendar preference support
            'CURRENT_DATE' => $dateService->formatDate(
                now(),
                $config->calendarPreference,
                'full',
                $config->language
            ),
            'CURRENT_DATE_NUMERIC' => $dateService->formatDate(
                now(),
                $config->calendarPreference,
                'numeric',
                $config->language
            ),
            'CURRENT_DATE_SHORT' => $dateService->formatDate(
                now(),
                $config->calendarPreference,
                'short',
                $config->language
            ),
            'CURRENT_DATE_GREGORIAN' => now()->format('Y-m-d'),
            'CURRENT_TIME' => now()->format('H:i'),
            'CURRENT_DATETIME' => $dateService->formatDate(
                now(),
                $config->calendarPreference,
                'full',
                $config->language
            ) . ' ' . now()->format('H:i'),
            'calendar_preference' => $config->calendarPreference,
            'language' => $config->language,

            // Template
            'template_name' => $templateName,

            // Parameters
            'parameters' => $config->parameters,

            // Date service for row data
            'date_service' => $dateService,
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
