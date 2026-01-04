<?php

namespace App\Services\Reports;

use App\Models\ReportRun;
use App\Models\ReportTemplate;
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
        private DateConversionService $dateService,
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
            $reportRun->updateProgress(15, 'Loaded layout configuration');

            // Load ReportTemplate (custom header/footer) if specified
            $reportTemplate = $this->loadReportTemplate($config);
            $reportRun->updateProgress(20, 'Loaded report template');

            // Merge report template settings with layout
            $layout = $this->mergeReportTemplate($layout, $reportTemplate, $branding);
            $reportRun->updateProgress(25, 'Merged template settings');

            // Load notes
            $notes = $this->loadNotes($config, $branding);
            $reportRun->updateProgress(30, 'Loaded notes');

            // Load watermark (pass reportTemplate to check for template-specific watermark)
            $watermark = $this->loadWatermark($config, $branding, $reportTemplate);
            $reportRun->updateProgress(40, 'Loaded watermark');

            // Build context for template
            $context = $this->buildContext($config, $data, $branding, $layout, $notes, $watermark);
            $reportRun->updateProgress(50, 'Built template context');
            
            // Log final font settings being used
            \Log::debug("Report context font settings", [
                'font_family' => $context['FONT_FAMILY'] ?? 'N/A',
                'font_size' => $context['FONT_SIZE'] ?? 'N/A',
                'template_font_family' => $layout['font_family'] ?? null,
                'template_font_size' => $layout['font_size'] ?? null,
                'branding_font_family' => $branding['font_family'] ?? null,
                'branding_font_size' => $branding['report_font_size'] ?? null,
            ]);

            // Get school ID from branding_id (branding_id is the school_id)
            $schoolId = $config->brandingId;

            // Generate the report
            if ($config->isPdf()) {
                $result = $this->pdfService->generate(
                    $config,
                    $context,
                    function ($progress, $message) use ($reportRun) {
                        $reportRun->updateProgress(50 + ($progress * 0.4), $message);
                    },
                    $organizationId,
                    $schoolId
                );
            } else {
                $result = $this->excelService->generate(
                    $config,
                    $context,
                    function ($progress, $message) use ($reportRun) {
                        $reportRun->updateProgress(50 + ($progress * 0.4), $message);
                    },
                    $organizationId,
                    $schoolId
                );
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
            \Log::warning("No brandingId provided in config, using default branding");
            return $this->getDefaultBranding();
        }

        \Log::debug("Loading branding for brandingId: {$config->brandingId}");

        $branding = $this->brandingCache->getBranding($config->brandingId);

        if (!$branding) {
            \Log::warning("Branding not found for {$config->brandingId}, using default branding");
            return $this->getDefaultBranding();
        }

        // CRITICAL: Verify colors are present in branding data
        if (empty($branding['primary_color']) || empty($branding['secondary_color']) || empty($branding['accent_color'])) {
            \Log::warning("Colors missing in branding data for {$config->brandingId}, using defaults");
            $branding['primary_color'] = $branding['primary_color'] ?? '#0b0b56';
            $branding['secondary_color'] = $branding['secondary_color'] ?? '#0056b3';
            $branding['accent_color'] = $branding['accent_color'] ?? '#ff6b35';
        }
        
        \Log::debug("Loaded branding for {$config->brandingId}", [
            'school_name' => $branding['school_name'] ?? 'N/A',
            'primary_color' => $branding['primary_color'] ?? 'N/A',
            'secondary_color' => $branding['secondary_color'] ?? 'N/A',
            'accent_color' => $branding['accent_color'] ?? 'N/A',
            'font_family' => $branding['font_family'] ?? 'N/A',
            'report_font_size' => $branding['report_font_size'] ?? 'N/A',
            'has_primary_logo' => !empty($branding['primary_logo_uri']),
            'has_secondary_logo' => !empty($branding['secondary_logo_uri']),
            'has_ministry_logo' => !empty($branding['ministry_logo_uri']),
            'show_primary_logo' => $branding['show_primary_logo'] ?? false,
            'show_secondary_logo' => $branding['show_secondary_logo'] ?? false,
            'show_ministry_logo' => $branding['show_ministry_logo'] ?? false,
        ]);

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
     * Priority: 1. Template's assigned watermark, 2. Branding's default watermark
     * Special case: If template's watermark_id is sentinel UUID, no watermark is shown
     */
    private function loadWatermark(ReportConfig $config, array $branding, ?ReportTemplate $reportTemplate = null): ?array
    {
        if ($config->watermarkMode === 'none') {
            return null;
        }

        $noWatermarkSentinel = '00000000-0000-0000-0000-000000000000';
        
        // Check if template explicitly has no watermark (watermark_id is sentinel UUID)
        $hasNoWatermark = $reportTemplate && $reportTemplate->watermark_id === $noWatermarkSentinel;
        if ($hasNoWatermark) {
            return null; // Explicitly no watermark
        }

        // First, check if report template has a specific watermark assigned (and it's not sentinel UUID)
        if ($reportTemplate && $reportTemplate->watermark_id && !$hasNoWatermark) {
            try {
                $templateWatermark = \App\Models\BrandingWatermark::where('id', $reportTemplate->watermark_id)
                    ->where('is_active', true)
                    ->whereNull('deleted_at')
                    ->first();
                
                if ($templateWatermark) {
                    $watermark = $templateWatermark->toArray();
                    // Add image data URI if it's an image watermark
                    if ($templateWatermark->isImage()) {
                        $watermark['image_data_uri'] = $templateWatermark->getImageDataUri();
                    }
                    return $watermark;
                }
            } catch (\Exception $e) {
                \Log::warning("Could not load template watermark: " . $e->getMessage());
            }
        }

        // Fall back to branding's default watermark (or report-specific watermark)
        if (!$config->brandingId) {
            return null;
        }

        return $this->brandingCache->getWatermark($config->brandingId, $config->reportKey);
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

        // Override font family if provided by template
        if ($template->font_family) {
            $layout['font_family'] = $template->font_family;
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
            // CRITICAL: Always use colors from branding, with fallback defaults
            'PRIMARY_COLOR' => !empty($branding['primary_color']) ? $branding['primary_color'] : '#0b0b56',
            'SECONDARY_COLOR' => !empty($branding['secondary_color']) ? $branding['secondary_color'] : '#0056b3',
            'ACCENT_COLOR' => !empty($branding['accent_color']) ? $branding['accent_color'] : '#ff6b35',
            // CRITICAL: Use template font family from layout first, then branding fallback
            'FONT_FAMILY' => $layout['font_family'] ?? $branding['font_family'] ?? 'Bahij Nassim',
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
            'header_text' => $layout['header_text'] ?? null,
            'header_text_position' => $layout['header_text_position'] ?? 'below_school_name',
            'footer_text' => $layout['footer_text'] ?? null,
            'footer_text_position' => $layout['footer_text_position'] ?? 'footer',

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
            'CURRENT_DATE' => $this->dateService->formatDate(
                now(),
                $config->calendarPreference,
                'full',
                $config->language
            ),
            'CURRENT_DATE_NUMERIC' => $this->dateService->formatDate(
                now(),
                $config->calendarPreference,
                'numeric',
                $config->language
            ),
            'CURRENT_DATE_SHORT' => $this->dateService->formatDate(
                now(),
                $config->calendarPreference,
                'short',
                $config->language
            ),
            'CURRENT_DATE_GREGORIAN' => now()->format('Y-m-d'),
            'CURRENT_TIME' => now()->format('H:i'),
            'CURRENT_DATETIME' => $this->dateService->formatDate(
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
            'date_service' => $this->dateService,

            // Pass through all custom data keys (for custom templates like student-history)
            // This allows templates to access custom data like 'student', 'summary', 'sections', etc.
            ...array_filter($data, function ($key) {
                return !in_array($key, ['columns', 'rows']);
            }, ARRAY_FILTER_USE_KEY),
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
            'calendar_preference' => 'jalali',
        ];
    }

    /**
     * Format a date value according to the report's calendar preference
     *
     * @param mixed $date Date value (string, Carbon, DateTime)
     * @param string $calendarPreference Calendar type
     * @param string $format Date format (full, short, numeric)
     * @param string $language Language code
     * @return string Formatted date
     */
    public function formatDate($date, string $calendarPreference = 'jalali', string $format = 'full', string $language = 'fa'): string
    {
        if (empty($date)) {
            return '';
        }

        try {
            return $this->dateService->formatDate($date, $calendarPreference, $format, $language);
        } catch (\Exception $e) {
            \Log::warning('Failed to format date', [
                'date' => $date,
                'calendar' => $calendarPreference,
                'error' => $e->getMessage(),
            ]);
            return (string) $date;
        }
    }

    /**
     * Get the date service for external use
     */
    public function getDateService(): DateConversionService
    {
        return $this->dateService;
    }
}
