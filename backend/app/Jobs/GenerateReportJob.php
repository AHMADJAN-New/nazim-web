<?php

namespace App\Jobs;

use App\Models\ReportRun;
use App\Models\ReportTemplate;
use App\Services\Reports\BrandingCacheService;
use App\Services\Reports\DateConversionService;
use App\Services\Reports\ExcelReportService;
use App\Services\Reports\PdfReportService;
use App\Services\Reports\ReportConfig;
use App\Services\StudentHistoryService;
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
     * Set to 1 to prevent retries (failures should be handled immediately)
     */
    public int $tries = 1;

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
        DateConversionService $dateService,
        StudentHistoryService $studentHistoryService
    ): void {
        $startTime = microtime(true);

        // Find the report run
        $reportRun = ReportRun::find($this->reportRunId);

        if (!$reportRun) {
            Log::error("Report run not found", ['report_run_id' => $this->reportRunId]);
            return;
        }

        try {
            // Mark as processing
            $reportRun->markProcessing();

            // Create config from data
            $config = ReportConfig::fromArray($this->configData);

            // Debug: Log config values
            Log::debug("Report generation job config (Job)", [
                'template_name' => $config->templateName,
                'has_parameters' => !empty($config->parameters),
                'parameters_keys' => array_keys($config->parameters ?? []),
                'student_id' => $config->parameters['student_id'] ?? null,
            ]);

            // CRITICAL: For custom templates like student-history, fetch data from parameters
            $reportData = $this->reportData;
            // Check both 'student-history' and 'reports.student-history' template names
            $isStudentHistoryTemplate = in_array($config->templateName, ['student-history', 'reports.student-history']);
            if ($isStudentHistoryTemplate && !empty($config->parameters['student_id'])) {
                Log::debug("Fetching student history data (Job) - condition met", [
                    'template_name' => $config->templateName,
                    'student_id' => $config->parameters['student_id'],
                ]);
                $reportData = $this->fetchStudentHistoryData($config, $reportRun->organization_id, $reportData, $studentHistoryService);
            } else {
                Log::debug("Skipping student history fetch (Job) - condition not met", [
                    'template_name' => $config->templateName,
                    'is_student_history' => $isStudentHistoryTemplate,
                    'has_student_id' => !empty($config->parameters['student_id'] ?? null),
                ]);
            }

            // Generate the report using the service
            // We need to manually handle the generation since we already have a report run
            $this->generateReport($reportRun, $config, $reportData, $brandingCache, $pdfService, $excelService, $dateService, $startTime);

        } catch (\Exception $e) {
            $durationMs = (int) ((microtime(true) - $startTime) * 1000);
            $reportRun->markFailed($e->getMessage(), $durationMs);

            Log::error('Report generation job failed', [
                'report_run_id' => $this->reportRunId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Use fail() to properly mark the job as failed without retrying
            // Since tries = 1, this won't retry anyway, but this ensures proper job failure handling
            $this->fail($e);
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
        
        // Debug: Log context data for student-history template
        $isStudentHistoryTemplate = in_array($config->templateName, ['student-history', 'reports.student-history']);
        if ($isStudentHistoryTemplate) {
            Log::debug("Student history context built (Job)", [
                'template_name' => $config->templateName,
                'has_student' => !empty($context['student']),
                'has_summary' => !empty($context['summary']),
                'has_sections' => !empty($context['sections']),
                'student_name' => $context['student']['full_name'] ?? 'N/A',
                'context_keys' => array_keys($context),
                'student_keys' => array_keys($context['student'] ?? []),
                'sections_keys' => array_keys($context['sections'] ?? []),
            ]);
        }
        
        // Log final font settings being used
        Log::debug("Report context font settings (Job)", [
            'font_family' => $context['FONT_FAMILY'] ?? 'N/A',
            'font_size' => $context['FONT_SIZE'] ?? 'N/A',
            'template_font_family' => $layout['font_family'] ?? null,
            'template_font_size' => $layout['font_size'] ?? null,
            'branding_font_family' => $branding['font_family'] ?? null,
            'branding_font_size' => $branding['report_font_size'] ?? null,
        ]);

        // Get organization_id and school_id for file storage
        // CRITICAL: Reports are school-scoped and MUST include both organizationId and schoolId
        $organizationId = $reportRun->organization_id;
        $schoolId = $config->brandingId ?? $reportRun->branding_id;
        
        // Validate required IDs
        if (!$organizationId) {
            throw new \Exception('Organization ID is required for report generation');
        }
        if (!$schoolId) {
            throw new \Exception('School ID (branding_id) is required for report generation');
        }

        // Generate the report
        if ($config->isPdf()) {
            $result = $pdfService->generate(
                $config,
                $context,
                function ($progress, $message) use ($reportRun) {
                    $reportRun->updateProgress(50 + ($progress * 0.4), $message);
                },
                $organizationId,
                $schoolId
            );
        } else {
            $result = $excelService->generate(
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
            Log::warning("No brandingId provided in config (Job), using default branding");
            return $this->getDefaultBranding();
        }

        Log::debug("Loading branding for brandingId (Job): {$config->brandingId}");

        $branding = $brandingCache->getBranding($config->brandingId);

        if (!$branding) {
            Log::warning("Branding not found for {$config->brandingId} (Job), using default branding");
            return $this->getDefaultBranding();
        }

        Log::debug("Loaded branding (Job)", [
            'school_name' => $branding['school_name'] ?? 'N/A',
            'font_family' => $branding['font_family'] ?? 'N/A',
            'report_font_size' => $branding['report_font_size'] ?? 'N/A',
        ]);

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
        ?array $watermark,
        DateConversionService $dateService
    ): array {
        $columns = $data['columns'] ?? [];
        $rows = $data['rows'] ?? [];
        
        // Format date fields in rows based on user's calendar preference
        $rows = $this->formatDateFieldsInRows($rows, $dateService, $config);

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
            
            // CRITICAL: Explicitly add student history data if present
            'student' => $data['student'] ?? [],
            'summary' => $data['summary'] ?? [],
            'sections' => $data['sections'] ?? [],
            'metadata' => $data['metadata'] ?? [],
            'generatedAt' => $data['generatedAt'] ?? now()->toISOString(),
            'labels' => $data['labels'] ?? [],
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
    
    /**
     * Format date fields in report rows based on calendar preference
     * Automatically detects date fields (ending with _at, _date, date) and formats them
     */
    private function formatDateFieldsInRows(array $rows, DateConversionService $dateService, ReportConfig $config): array
    {
        if (empty($rows)) {
            return $rows;
        }
        
        // Common date field patterns
        $dateFieldPatterns = ['_at', '_date', 'date'];
        
        foreach ($rows as &$row) {
            if (!is_array($row)) {
                continue;
            }
            
            foreach ($row as $key => $value) {
                // Check if this field looks like a date
                $isDateField = false;
                foreach ($dateFieldPatterns as $pattern) {
                    if (str_ends_with(strtolower($key), $pattern)) {
                        $isDateField = true;
                        break;
                    }
                }
                
                if ($isDateField && !empty($value)) {
                    try {
                        // Try to parse the date value
                        $dateValue = null;
                        if (is_string($value)) {
                            // Try to parse ISO date string (YYYY-MM-DD)
                            if (preg_match('/^\d{4}-\d{2}-\d{2}/', $value)) {
                                $dateValue = \Carbon\Carbon::parse($value);
                            }
                        } elseif ($value instanceof \DateTime || $value instanceof \Carbon\Carbon) {
                            $dateValue = \Carbon\Carbon::instance($value);
                        }
                        
                        if ($dateValue) {
                            // Format the date based on user's calendar preference
                            $row[$key] = $dateService->formatDate(
                                $dateValue,
                                $config->calendarPreference,
                                'full',
                                $config->language
                            );
                        }
                    } catch (\Exception $e) {
                        // If date parsing fails, leave the value as-is
                        \Log::debug("Failed to format date field {$key}: " . $e->getMessage());
                    }
                }
            }
        }
        
        return $rows;
    }

    /**
     * Fetch student history data for student-history template
     */
    private function fetchStudentHistoryData(
        ReportConfig $config,
        ?string $organizationId,
        array $data,
        StudentHistoryService $studentHistoryService
    ): array {
        $studentId = $config->parameters['student_id'] ?? null;
        if (!$studentId) {
            Log::warning('Student ID not provided in parameters for student-history template');
            return $data;
        }

        if (!$organizationId) {
            Log::warning('Organization ID not available for student history data fetch');
            return $data;
        }

        // Get current school ID from branding_id (branding_id is the school_id)
        $schoolId = $config->brandingId;

        try {
            Log::debug("Fetching student history data (Job)", [
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
            $history = $studentHistoryService->getStudentHistory(
                $studentId,
                $organizationId,
                $schoolId,
                $filters
            );

            Log::debug("Student history fetched (Job)", [
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
                    'return_date' => isset($loan['returnDate']) && $loan['returnDate'] ? \Carbon\Carbon::parse($loan['returnDate'])->format('Y-m-d') : '',
                    'status' => $loan['status'] ?? '',
                ];
            }, $sections['library'] ?? []);

            // Format ID cards section
            $idCardsData = array_map(function ($card) {
                return [
                    'card_type' => $card['cardType']['name'] ?? '',
                    'issue_date' => isset($card['issueDate']) && $card['issueDate'] ? \Carbon\Carbon::parse($card['issueDate'])->format('Y-m-d') : '',
                    'expiry_date' => isset($card['expiryDate']) && $card['expiryDate'] ? \Carbon\Carbon::parse($card['expiryDate'])->format('Y-m-d') : '',
                    'status' => $card['status'] ?? '',
                ];
            }, $sections['idCards'] ?? []);

            // Format courses section
            $coursesData = array_map(function ($course) {
                return [
                    // Match StudentHistoryController::buildPdfReportData() and Blade template expectations
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
                    // Match StudentHistoryController::buildPdfReportData() and Blade template expectations
                    'batch_name' => $graduation['batch']['name'] ?? '',
                    'graduation_date' => isset($graduation['createdAt']) && $graduation['createdAt'] ? \Carbon\Carbon::parse($graduation['createdAt'])->format('Y-m-d') : '',
                    'final_result' => $graduation['finalResultStatus'] ?? '',
                    'certificate_number' => $graduation['certificateNumber'] ?? '',
                ];
            }, $sections['graduations'] ?? []);

            // Combine all sections
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

            // Merge student history data into the data array
            $mergedData = array_merge($data, [
                'student' => $studentData,
                'summary' => $summaryData,
                'sections' => $sectionsData,
                'metadata' => $metadata,
                'generatedAt' => $metadata['generatedAt'] ?? now()->toISOString(),
                'labels' => [], // Will be populated by template based on language
            ]);

            Log::debug("Student history data merged (Job)", [
                'has_student' => !empty($mergedData['student']),
                'has_summary' => !empty($mergedData['summary']),
                'has_sections' => !empty($mergedData['sections']),
                'student_name' => $mergedData['student']['full_name'] ?? 'N/A',
            ]);

            return $mergedData;
        } catch (\Exception $e) {
            Log::error("Failed to fetch student history data (Job): " . $e->getMessage(), [
                'student_id' => $studentId,
                'error' => $e->getTraceAsString(),
            ]);
            // Return original data on error
            return $data;
        }
    }
}
