<?php

namespace App\Services\Reports;

use App\Models\ReportRun;
use App\Models\ReportTemplate;
use App\Models\SchoolBranding;
use App\Services\StudentHistoryService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
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
        private StudentHistoryService $historyService,
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

        // CRITICAL: For student history reports (PDF with template or Excel with sheets), fetch data from parameters
        // Check by template name (PDF) or report key + student_id (Excel)
        $isStudentHistoryReport = ($config->templateName === 'student-history' || 
                                   ($config->reportKey === 'student_lifetime_history' && 
                                    !empty($config->parameters['student_id']))) &&
                                   !empty($config->parameters['student_id']);
        
        if ($isStudentHistoryReport) {
            $data = $this->fetchStudentHistoryData($config, $organizationId, $data);
        }

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

        $context = [
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
            // CRITICAL: Explicitly add student history data if present
            'student' => $data['student'] ?? [],
            'summary' => $data['summary'] ?? [],
            'sections' => $data['sections'] ?? [],
            'metadata' => $data['metadata'] ?? [],
            'generatedAt' => $data['generatedAt'] ?? now()->toISOString(),
            'labels' => $data['labels'] ?? [],

            // Also pass through any other custom data keys (excluding columns/rows)
            ...array_filter($data, function ($key) {
                return !in_array($key, ['columns', 'rows', 'student', 'summary', 'sections', 'metadata', 'generatedAt', 'labels']);
            }, ARRAY_FILTER_USE_KEY),
        ];

        // Debug: Log context data for student-history template
        if ($templateName === 'student-history') {
            \Log::debug("Student history context built", [
                'has_student' => !empty($context['student']),
                'has_summary' => !empty($context['summary']),
                'has_sections' => !empty($context['sections']),
                'student_name' => $context['student']['full_name'] ?? 'N/A',
                'context_keys' => array_keys($context),
                'data_keys' => array_keys($data),
            ]);
        }

        return $context;
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

    /**
     * Fetch student history data for student-history template
     * This method is called when template_name is 'student-history' and parameters.student_id is provided
     */
    private function fetchStudentHistoryData(ReportConfig $config, ?string $organizationId, array $data): array
    {
        $studentId = $config->parameters['student_id'] ?? null;
        if (!$studentId) {
            \Log::warning('Student ID not provided in parameters for student-history template');
            return $data;
        }

        if (!$organizationId) {
            // Try to get organization from authenticated user
            $user = Auth::user();
            if ($user) {
                $profile = DB::table('profiles')->where('id', $user->id)->first();
                $organizationId = $profile->organization_id ?? null;
            }
        }

        if (!$organizationId) {
            \Log::warning('Organization ID not available for student history data fetch');
            return $data;
        }

        // Get current school ID from branding_id (branding_id is the school_id)
        $schoolId = $config->brandingId;

        try {
            \Log::debug("Fetching student history data", [
                'student_id' => $studentId,
                'organization_id' => $organizationId,
                'school_id' => $schoolId,
                'sections_filter' => $config->parameters['sections'] ?? null,
            ]);

            // Prepare filters (sections filter if provided)
            $filters = [];
            if (!empty($config->parameters['sections']) && is_array($config->parameters['sections'])) {
                $filters['sections'] = $config->parameters['sections'];
            }

            // Fetch student history using StudentHistoryService
            $history = $this->historyService->getStudentHistory(
                $studentId,
                $organizationId,
                $schoolId,
                $filters
            );

            \Log::debug("Student history fetched", [
                'has_student' => !empty($history['student']),
                'has_summary' => !empty($history['summary']),
                'has_sections' => !empty($history['sections']),
                'sections_keys' => array_keys($history['sections'] ?? []),
            ]);

            // Format data for template (same structure as StudentHistoryController::buildPdfReportData)
            $student = $history['student'] ?? [];
            $summary = $history['summary'] ?? [];
            $sections = $history['sections'] ?? [];
            $metadata = $history['metadata'] ?? [];

            // Format student data for template (snake_case for Blade template)
            $studentData = [
                'full_name' => $student['fullName'] ?? '',
                'admission_no' => $student['admissionNumber'] ?? '',
                'father_name' => $student['fatherName'] ?? '',
                'current_class' => $student['currentClass']['name'] ?? '',
                'current_section' => $student['currentClass']['section'] ?? '',
                'current_academic_year' => $student['currentClass']['academicYear'] ?? '',
                'birth_date' => isset($student['dateOfBirth']) && $student['dateOfBirth'] ? \Carbon\Carbon::parse($student['dateOfBirth'])->format('Y-m-d') : '',
                'status' => $student['status'] ?? '',
                'phone' => $student['phone'] ?? '',
                'picture_path' => $student['picturePath'] ?? null,
                'school_name' => $student['schoolName'] ?? '',
                'organization_name' => $student['organizationName'] ?? '',
                'student_code' => $student['studentCode'] ?? '',
                'card_number' => $student['cardNumber'] ?? '',
                'gender' => $student['gender'] ?? '',
                'nationality' => $student['nationality'] ?? '',
                'preferred_language' => $student['preferredLanguage'] ?? '',
                'home_address' => $student['homeAddress'] ?? '',
                'previous_school' => $student['previousSchool'] ?? '',
                'guardian_name' => $student['guardianName'] ?? '',
                'guardian_relation' => $student['guardianRelation'] ?? '',
                'guardian_phone' => $student['guardianPhone'] ?? '',
                'emergency_contact_name' => $student['emergencyContactName'] ?? '',
                'emergency_contact_phone' => $student['emergencyContactPhone'] ?? '',
            ];

            // Format summary data
            $summaryData = [
                'academic_years' => $summary['totalAcademicYears'] ?? 0,
                'attendance_rate' => round($summary['attendanceRate'] ?? 0, 2),
                'exam_average' => round($summary['averageExamScore'] ?? 0, 2),
                'total_fees_paid' => $summary['totalFeesPaid'] ?? 0,
                'library_loans' => $summary['totalLibraryLoans'] ?? 0,
                'courses_completed' => $summary['totalCoursesCompleted'] ?? 0,
            ];

            // Format sections data for template (snake_case keys as expected by template)
            // Format admissions section
            $admissionsData = array_map(function ($admission) {
                return [
                    'academic_year' => $admission['academicYear']['name'] ?? '',
                    'class' => $admission['class']['name'] ?? '',
                    'admission_date' => isset($admission['admissionDate']) && $admission['admissionDate'] ? \Carbon\Carbon::parse($admission['admissionDate'])->format('Y-m-d') : '',
                    'enrollment_status' => $admission['enrollmentStatus'] ?? '',
                    'enrollment_type' => $admission['enrollmentType'] ?? '',
                    'residency_type' => $admission['residencyType']['name'] ?? '',
                ];
            }, $sections['admissions'] ?? []);

            // Format attendance section
            $attendanceSummary = $sections['attendance']['summary'] ?? [];
            $attendanceData = [
                'summary' => [
                    'total_days' => $attendanceSummary['totalDays'] ?? 0,
                    'present' => $attendanceSummary['present'] ?? 0,
                    'absent' => $attendanceSummary['absent'] ?? 0,
                    'late' => $attendanceSummary['late'] ?? 0,
                    'rate' => round($attendanceSummary['rate'] ?? 0, 2),
                ],
                'monthly_breakdown' => array_map(function ($item) {
                    return [
                        'month' => $item['month'] ?? '',
                        'present' => $item['present'] ?? 0,
                        'absent' => $item['absent'] ?? 0,
                        'late' => $item['late'] ?? 0,
                        'rate' => round($item['rate'] ?? 0, 2),
                    ];
                }, $sections['attendance']['monthlyBreakdown'] ?? []),
            ];

            // Format exams section
            $examsSummary = $sections['exams']['summary'] ?? [];
            $examsData = [
                'summary' => [
                    'total_exams' => $examsSummary['totalExams'] ?? 0,
                    'average_percentage' => round($examsSummary['averagePercentage'] ?? 0, 2),
                ],
                'exams' => array_map(function ($exam) {
                    $subjectResults = array_map(function ($result) {
                        return [
                            'subject_name' => $result['subjectName'] ?? '',
                            'marks_obtained' => $result['marksObtained'] ?? 0,
                            'max_marks' => $result['maxMarks'] ?? 0,
                            'percentage' => round($result['percentage'] ?? 0, 2),
                            'is_absent' => $result['isAbsent'] ?? false,
                        ];
                    }, $exam['subjectResults'] ?? []);
                    
                    return [
                        'exam_name' => $exam['examName'] ?? '',
                        'class_name' => $exam['className'] ?? '',
                        'exam_date' => isset($exam['examStartDate']) && $exam['examStartDate'] ? \Carbon\Carbon::parse($exam['examStartDate'])->format('Y-m-d') : '',
                        'total_marks' => $exam['totalMarks'] ?? 0,
                        'max_marks' => $exam['maxMarks'] ?? 0,
                        'percentage' => round($exam['percentage'] ?? 0, 2),
                        'subject_results' => $subjectResults,
                    ];
                }, $sections['exams']['exams'] ?? []),
            ];

            // Format fees section
            $feesSummary = $sections['fees']['summary'] ?? [];
            $feesData = [
                'summary' => [
                    'total_assigned' => $feesSummary['totalAssigned'] ?? 0,
                    'total_paid' => $feesSummary['totalPaid'] ?? 0,
                    'total_remaining' => $feesSummary['totalRemaining'] ?? 0,
                ],
                'assignments' => array_map(function ($assignment) {
                    $payments = array_map(function ($payment) {
                        return [
                            'payment_date' => isset($payment['paymentDate']) && $payment['paymentDate'] ? \Carbon\Carbon::parse($payment['paymentDate'])->format('Y-m-d') : '',
                            'amount' => $payment['amount'] ?? 0,
                            'payment_method' => $payment['paymentMethod'] ?? '',
                            'reference_no' => $payment['referenceNo'] ?? '',
                        ];
                    }, $assignment['feePayments'] ?? []);
                    
                    return [
                        'fee_structure' => $assignment['feeStructure']['name'] ?? '',
                        'academic_year' => $assignment['academicYear']['name'] ?? '',
                        'assigned_amount' => $assignment['assignedAmount'] ?? 0,
                        'paid_amount' => $assignment['paidAmount'] ?? 0,
                        'remaining_amount' => $assignment['remainingAmount'] ?? 0,
                        'status' => $assignment['status'] ?? '',
                        'due_date' => isset($assignment['dueDate']) && $assignment['dueDate'] ? \Carbon\Carbon::parse($assignment['dueDate'])->format('Y-m-d') : '',
                        'payments' => $payments,
                    ];
                }, $sections['fees']['assignments'] ?? []),
            ];

            // Format library section
            $libraryData = array_map(function ($loan) {
                return [
                    'book_title' => $loan['book']['title'] ?? '',
                    'author' => $loan['book']['author'] ?? '',
                    'loan_date' => isset($loan['loanDate']) && $loan['loanDate'] ? \Carbon\Carbon::parse($loan['loanDate'])->format('Y-m-d') : '',
                    'due_date' => isset($loan['dueDate']) && $loan['dueDate'] ? \Carbon\Carbon::parse($loan['dueDate'])->format('Y-m-d') : '',
                    'return_date' => isset($loan['returnedAt']) && $loan['returnedAt'] ? \Carbon\Carbon::parse($loan['returnedAt'])->format('Y-m-d') : null,
                    'status' => $loan['status'] ?? '',
                ];
            }, $sections['library']['loans'] ?? []);

            // Format ID cards section
            $idCardsData = array_map(function ($card) {
                return [
                    'card_number' => $card['cardNumber'] ?? '',
                    'academic_year' => $card['academicYear']['name'] ?? '',
                    'class' => $card['class']['name'] ?? '',
                    'issued_at' => isset($card['createdAt']) && $card['createdAt'] ? \Carbon\Carbon::parse($card['createdAt'])->format('Y-m-d') : '',
                    'is_printed' => $card['isPrinted'] ?? false,
                    'template' => $card['templateName'] ?? ($card['template']['name'] ?? ''),
                    'fee_paid' => $card['feePaid'] ?? null,
                ];
            }, $sections['idCards'] ?? []);

            // Format courses section
            $coursesData = array_map(function ($course) {
                return [
                    'course_name' => $course['course']['name'] ?? '',
                    'registration_date' => isset($course['registrationDate']) && $course['registrationDate'] ? \Carbon\Carbon::parse($course['registrationDate'])->format('Y-m-d') : '',
                    'status' => $course['completionStatus'] ?? '',
                    'completion_date' => isset($course['completionDate']) && $course['completionDate'] ? \Carbon\Carbon::parse($course['completionDate'])->format('Y-m-d') : null,
                    'grade' => $course['grade'] ?? '',
                    'certificate_issued' => $course['certificateIssued'] ?? false,
                ];
            }, $sections['courses'] ?? []);

            // Format graduations section
            $graduationsData = array_map(function ($graduation) {
                return [
                    'batch_name' => $graduation['batch']['name'] ?? '',
                    'graduation_date' => isset($graduation['createdAt']) && $graduation['createdAt'] ? \Carbon\Carbon::parse($graduation['createdAt'])->format('Y-m-d') : '',
                    'final_result' => $graduation['finalResultStatus'] ?? '',
                    'certificate_number' => $graduation['certificateNumber'] ?? '',
                ];
            }, $sections['graduations'] ?? []);

            // Format sections data for template (all in snake_case)
            $sectionsData = [
                'admissions' => $admissionsData,
                'attendance' => $attendanceData,
                'exams' => $examsData,
                'fees' => $feesData,
                'library' => $libraryData,
                'id_cards' => $idCardsData,
                'courses' => $coursesData,
                'graduations' => $graduationsData,
            ];

            // Check if this is an Excel report - Excel reports use multi-sheet structure
            if ($config->isExcel()) {
                // Build Excel report data structure with sheets (same as StudentHistoryController::buildExcelReportData)
                // Use original camelCase sections from history, not snake_case formatted sectionsData
                return [
                    // Top-level columns and rows (required for validation, but empty since we use sheets)
                    'columns' => [],
                    'rows' => [],
                    'student' => $student,
                    'summary' => $summary,
                    'parameters' => [
                        'sheets' => $this->buildExcelSheetsData($student, $summary, $history['sections'] ?? []),
                    ],
                    'metadata' => $metadata,
                ];
            }

            // For PDF reports, merge student history data into the data array
            // This will be passed through to the template via buildContext
            $mergedData = array_merge($data, [
                'student' => $studentData,
                'summary' => $summaryData,
                'sections' => $sectionsData,
                'metadata' => $metadata,
                'generatedAt' => $metadata['generatedAt'] ?? now()->toISOString(),
                'labels' => [], // Will be populated by template based on language
            ]);

            \Log::debug("Student history data merged", [
                'has_student' => !empty($mergedData['student']),
                'has_summary' => !empty($mergedData['summary']),
                'has_sections' => !empty($mergedData['sections']),
                'student_name' => $mergedData['student']['full_name'] ?? 'N/A',
                'sections_count' => count($mergedData['sections'] ?? []),
            ]);

            return $mergedData;

        } catch (\Exception $e) {
            \Log::error('Failed to fetch student history data', [
                'student_id' => $studentId,
                'organization_id' => $organizationId,
                'error' => $e->getMessage(),
            ]);
            return $data; // Return original data on error
        }
    }

    /**
     * Build Excel sheets data structure for student history
     * This matches the structure from StudentHistoryController::buildExcelReportData
     */
    private function buildExcelSheetsData(array $student, array $summary, array $sections): array
    {
        return [
            'overview' => [
                'sheet_name' => 'Overview',
                'title' => 'Student Overview',
                'columns' => [
                    ['key' => 'field', 'label' => 'Field'],
                    ['key' => 'value', 'label' => 'Value'],
                ],
                'rows' => [
                    ['field' => 'Full Name', 'value' => $student['fullName'] ?? ''],
                    ['field' => 'Admission Number', 'value' => $student['admissionNumber'] ?? ''],
                    ['field' => 'Father Name', 'value' => $student['fatherName'] ?? ''],
                    ['field' => 'Status', 'value' => $student['status'] ?? ''],
                    ['field' => 'Total Academic Years', 'value' => (string) ($summary['totalAcademicYears'] ?? 0)],
                    ['field' => 'Attendance Rate', 'value' => ($summary['attendanceRate'] ?? 0) . '%'],
                    ['field' => 'Average Exam Score', 'value' => ($summary['averageExamScore'] ?? 0) . '%'],
                    ['field' => 'Outstanding Fees', 'value' => (string) ($summary['outstandingFees'] ?? 0)],
                ],
            ],
            'admissions' => [
                'sheet_name' => 'Admissions',
                'title' => 'Admission History',
                'columns' => [
                    ['key' => 'admissionDate', 'label' => 'Admission Date'],
                    ['key' => 'class', 'label' => 'Class'],
                    ['key' => 'academicYear', 'label' => 'Academic Year'],
                    ['key' => 'status', 'label' => 'Status'],
                ],
                'rows' => array_map(function ($admission) {
                    return [
                        'admissionDate' => isset($admission['admissionDate']) && $admission['admissionDate'] ? \Carbon\Carbon::parse($admission['admissionDate'])->format('Y-m-d') : '',
                        'class' => $admission['class']['name'] ?? '',
                        'academicYear' => $admission['academicYear']['name'] ?? '',
                        'status' => $admission['enrollmentStatus'] ?? '',
                    ];
                }, $sections['admissions'] ?? []),
            ],
            'exams' => [
                'sheet_name' => 'Exams',
                'title' => 'Exam Results',
                'columns' => [
                    ['key' => 'examName', 'label' => 'Exam Name'],
                    ['key' => 'className', 'label' => 'Class'],
                    ['key' => 'totalMarks', 'label' => 'Marks Obtained'],
                    ['key' => 'maxMarks', 'label' => 'Max Marks'],
                    ['key' => 'percentage', 'label' => 'Percentage'],
                ],
                'rows' => array_map(function ($exam) {
                    return [
                        'examName' => $exam['examName'] ?? '',
                        'className' => $exam['className'] ?? '',
                        'totalMarks' => (string) ($exam['totalMarks'] ?? 0),
                        'maxMarks' => (string) ($exam['maxMarks'] ?? 0),
                        'percentage' => ($exam['percentage'] ?? 0) . '%',
                    ];
                }, $sections['exams']['exams'] ?? []),
            ],
            'fees' => [
                'sheet_name' => 'Fees',
                'title' => 'Fee History',
                'columns' => [
                    ['key' => 'feeStructure', 'label' => 'Fee Structure'],
                    ['key' => 'academicYear', 'label' => 'Academic Year'],
                    ['key' => 'assignedAmount', 'label' => 'Assigned'],
                    ['key' => 'paidAmount', 'label' => 'Paid'],
                    ['key' => 'remainingAmount', 'label' => 'Remaining'],
                    ['key' => 'status', 'label' => 'Status'],
                ],
                'rows' => array_map(function ($assignment) {
                    return [
                        'feeStructure' => $assignment['feeStructure']['name'] ?? '',
                        'academicYear' => $assignment['academicYear']['name'] ?? '',
                        'assignedAmount' => (string) ($assignment['assignedAmount'] ?? 0),
                        'paidAmount' => (string) ($assignment['paidAmount'] ?? 0),
                        'remainingAmount' => (string) ($assignment['remainingAmount'] ?? 0),
                        'status' => $assignment['status'] ?? '',
                    ];
                }, $sections['fees']['assignments'] ?? []),
            ],
            'library' => [
                'sheet_name' => 'Library',
                'title' => 'Library Loans',
                'columns' => [
                    ['key' => 'bookTitle', 'label' => 'Book Title'],
                    ['key' => 'author', 'label' => 'Author'],
                    ['key' => 'accessionNumber', 'label' => 'Accession #'],
                    ['key' => 'loanDate', 'label' => 'Loan Date'],
                    ['key' => 'dueDate', 'label' => 'Due Date'],
                    ['key' => 'returnedAt', 'label' => 'Returned'],
                    ['key' => 'status', 'label' => 'Status'],
                ],
                'rows' => array_map(function ($loan) {
                    return [
                        'bookTitle' => $loan['book']['title'] ?? '',
                        'author' => $loan['book']['author'] ?? '',
                        'accessionNumber' => $loan['book']['accessionNumber'] ?? '',
                        'loanDate' => isset($loan['loanDate']) && $loan['loanDate'] ? \Carbon\Carbon::parse($loan['loanDate'])->format('Y-m-d') : '',
                        'dueDate' => isset($loan['dueDate']) && $loan['dueDate'] ? \Carbon\Carbon::parse($loan['dueDate'])->format('Y-m-d') : '',
                        'returnedAt' => isset($loan['returnedAt']) && $loan['returnedAt'] ? \Carbon\Carbon::parse($loan['returnedAt'])->format('Y-m-d') : '',
                        'status' => $loan['status'] ?? '',
                    ];
                }, $sections['library']['loans'] ?? []),
            ],
            'attendance' => [
                'sheet_name' => 'Attendance',
                'title' => 'Attendance Summary',
                'columns' => [
                    ['key' => 'month', 'label' => 'Month'],
                    ['key' => 'present', 'label' => 'Present'],
                    ['key' => 'absent', 'label' => 'Absent'],
                    ['key' => 'late', 'label' => 'Late'],
                    ['key' => 'rate', 'label' => 'Rate (%)'],
                ],
                'rows' => array_map(function ($item) {
                    return [
                        'month' => $item['month'] ?? '',
                        'present' => (string) ($item['present'] ?? 0),
                        'absent' => (string) ($item['absent'] ?? 0),
                        'late' => (string) ($item['late'] ?? 0),
                        'rate' => round($item['rate'] ?? 0, 2) . '%',
                    ];
                }, $sections['attendance']['monthlyBreakdown'] ?? []),
            ],
            'id_cards' => [
                'sheet_name' => 'ID Cards',
                'title' => 'ID Card History',
                'columns' => [
                    ['key' => 'cardNumber', 'label' => 'Card Number'],
                    ['key' => 'template', 'label' => 'Template'],
                    ['key' => 'academicYear', 'label' => 'Academic Year'],
                    ['key' => 'class', 'label' => 'Class'],
                    ['key' => 'issueDate', 'label' => 'Issue Date'],
                    ['key' => 'isPrinted', 'label' => 'Printed'],
                    ['key' => 'feePaid', 'label' => 'Fee Paid'],
                ],
                'rows' => array_map(function ($card) {
                    return [
                        'cardNumber' => $card['cardNumber'] ?? '',
                        'template' => $card['template']['name'] ?? '',
                        'academicYear' => $card['academicYear']['name'] ?? '',
                        'class' => $card['class']['name'] ?? '',
                        'issueDate' => isset($card['createdAt']) && $card['createdAt'] ? \Carbon\Carbon::parse($card['createdAt'])->format('Y-m-d') : '',
                        'isPrinted' => $card['isPrinted'] ? 'Yes' : 'No',
                        'feePaid' => $card['feePaid'] ? 'Yes' : 'No',
                    ];
                }, $sections['idCards'] ?? []),
            ],
            'courses' => [
                'sheet_name' => 'Courses',
                'title' => 'Short-Term Courses',
                'columns' => [
                    ['key' => 'courseName', 'label' => 'Course Name'],
                    ['key' => 'registrationDate', 'label' => 'Registration Date'],
                    ['key' => 'completionDate', 'label' => 'Completion Date'],
                    ['key' => 'completionStatus', 'label' => 'Status'],
                    ['key' => 'grade', 'label' => 'Grade'],
                    ['key' => 'certificateIssued', 'label' => 'Certificate Issued'],
                ],
                'rows' => array_map(function ($course) {
                    return [
                        'courseName' => $course['course']['name'] ?? '',
                        'registrationDate' => isset($course['registrationDate']) && $course['registrationDate'] ? \Carbon\Carbon::parse($course['registrationDate'])->format('Y-m-d') : '',
                        'completionDate' => isset($course['completionDate']) && $course['completionDate'] ? \Carbon\Carbon::parse($course['completionDate'])->format('Y-m-d') : '',
                        'completionStatus' => $course['completionStatus'] ?? '',
                        'grade' => $course['grade'] ?? '',
                        'certificateIssued' => $course['certificateIssued'] ? 'Yes' : 'No',
                    ];
                }, $sections['courses'] ?? []),
            ],
            'graduations' => [
                'sheet_name' => 'Graduations',
                'title' => 'Graduation Records',
                'columns' => [
                    ['key' => 'batchName', 'label' => 'Batch Name'],
                    ['key' => 'graduationDate', 'label' => 'Graduation Date'],
                    ['key' => 'finalResult', 'label' => 'Final Result'],
                    ['key' => 'certificateNumber', 'label' => 'Certificate #'],
                ],
                'rows' => array_map(function ($graduation) {
                    return [
                        'batchName' => $graduation['batch']['name'] ?? '',
                        'graduationDate' => isset($graduation['createdAt']) && $graduation['createdAt'] ? \Carbon\Carbon::parse($graduation['createdAt'])->format('Y-m-d') : '',
                        'finalResult' => $graduation['finalResultStatus'] ?? '',
                        'certificateNumber' => $graduation['certificateNumber'] ?? '',
                    ];
                }, $sections['graduations'] ?? []),
            ],
        ];
    }
}
