<?php

namespace App\Http\Controllers;

use App\Jobs\GenerateReportJob;
use App\Models\ReportRun;
use App\Services\Reports\ReportConfig;
use App\Services\Reports\ReportService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ReportGenerationController extends Controller
{
    public function __construct(
        private ReportService $reportService,
        private StudentHistoryService $historyService
    ) {}

    /**
     * Generate a report (synchronous or async)
     *
     * POST /api/reports/generate
     */
    public function generate(Request $request)
    {
        $validated = $request->validate([
            'report_key' => 'required|string|max:100',
            'report_type' => 'required|in:pdf,excel',
            'branding_id' => 'nullable|uuid',
            'layout_id' => 'nullable|uuid',
            'report_template_id' => 'nullable|uuid',
            'template_name' => 'nullable|string|max:100',
            'title' => 'nullable|string|max:255',
            'watermark_mode' => 'nullable|in:default,pick,none',
            'notes_mode' => 'nullable|in:defaults,custom,none',
            'parameters' => 'nullable|array',
            'column_config' => 'nullable|array',
            // CRITICAL: For custom templates (like student-history), columns and rows can be empty
            // The template will fetch its own data from parameters
            'columns' => 'required|array',
            'columns.*' => 'nullable', // Allow null values in columns array
            'rows' => 'required|array',
            'async' => 'nullable|boolean',
        ]);

        // Get organization from authenticated user
        $user = $request->user();
        $profile = Auth::user()?->profile;
        $organizationId = $profile?->organization_id;
        $currentSchoolId = $request->get('current_school_id');

        if (!$organizationId) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }
        if (!$currentSchoolId) {
            return response()->json(['error' => 'School context is required'], 403);
        }

        // Check if user has schools_access_all permission
        $hasSchoolsAccessAll = (bool) ($profile->schools_access_all ?? false);

        // Enforce school scoping: branding_id is the school id (school_branding)
        // For users with schools_access_all, allow generating reports for any school in their organization
        // For other users, branding_id must match their current school
        if (!empty($validated['branding_id'])) {
            if (!$hasSchoolsAccessAll && $validated['branding_id'] !== $currentSchoolId) {
                return response()->json(['error' => 'Cannot generate report for a different school'], 403);
            }
            
            // For users with schools_access_all, validate that the branding_id belongs to their organization
            if ($hasSchoolsAccessAll) {
                $brandingSchool = DB::table('school_branding')
                    ->where('id', $validated['branding_id'])
                    ->where('organization_id', $organizationId)
                    ->whereNull('deleted_at')
                    ->first();
                
                if (!$brandingSchool) {
                    return response()->json(['error' => 'Invalid school for report generation'], 403);
                }
            }
        }

        // Create config
        $config = ReportConfig::fromArray([
            'report_key' => $validated['report_key'],
            'report_type' => $validated['report_type'],
            'branding_id' => $validated['branding_id'] ?? $currentSchoolId,
            'layout_id' => $validated['layout_id'] ?? null,
            'report_template_id' => $validated['report_template_id'] ?? null,
            'template_name' => $validated['template_name'] ?? null,
            'title' => $validated['title'] ?? '',
            'watermark_mode' => $validated['watermark_mode'] ?? 'default',
            'notes_mode' => $validated['notes_mode'] ?? 'defaults',
            'generated_by' => 'NazimWeb',
            'parameters' => $validated['parameters'] ?? [],
            'column_config' => $validated['column_config'] ?? [],
        ]);

        // CRITICAL: For student_lifetime_history report, fetch data from StudentHistoryService
        // This report uses a custom template that needs full student history data
        if ($validated['report_key'] === 'student_lifetime_history' && !empty($validated['parameters']['student_id'])) {
            $studentId = $validated['parameters']['student_id'];
            
            // Get current school ID from request
            $currentSchoolId = $request->get('current_school_id');
            if (!$currentSchoolId) {
                return response()->json(['error' => 'School context is required'], 403);
            }
            
            // Fetch student history data
            $history = $this->historyService->getStudentHistory($studentId, $organizationId, $currentSchoolId);
            
            // Build report data using the same logic as StudentHistoryController
            // We copy the logic here to avoid dependency injection issues
            if ($validated['report_type'] === 'pdf') {
                $reportData = $this->buildStudentHistoryPdfData($history);
            } else {
                $reportData = $this->buildStudentHistoryExcelData($history);
            }
            
            // Merge with validated columns/rows (they may be placeholders)
            $data = array_merge($reportData, [
                'columns' => $validated['columns'],
                'rows' => $validated['rows'],
            ]);
        } else {
            // Prepare data for standard reports
            $data = [
                'columns' => $validated['columns'],
                'rows' => $validated['rows'],
            ];
        }

        // Check if async is requested
        $async = $validated['async'] ?? false;

        // Check if queue is available (for async processing)
        // In development, default to sync unless explicitly using a queue driver
        $queueDriver = config('queue.default', 'sync');
        $queueConnection = config("queue.connections.{$queueDriver}.driver", 'sync');
        $queueAvailable = $queueConnection !== 'sync';

        // If async requested but queue not available, fall back to sync
        if ($async && !$queueAvailable) {
            \Log::info('Async report generation requested but queue not available (using sync driver), falling back to sync processing');
            $async = false;
        }

        if ($async) {
            // Create pending report run
            $reportRun = ReportRun::create([
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
                'row_count' => count($data['rows']),
                'generated_by' => $config->generatedBy,
                'status' => ReportRun::STATUS_PENDING,
                'progress' => 0,
            ]);

            try {
                // Dispatch job
                GenerateReportJob::dispatch($reportRun->id, $config->toArray(), $data);

                return response()->json([
                    'success' => true,
                    'report_id' => $reportRun->id,
                    'status' => 'pending',
                    'message' => 'Report generation started',
                ]);
            } catch (\Exception $e) {
                // If job dispatch fails, mark as failed and fall back to sync
                \Log::error('Failed to dispatch report job: ' . $e->getMessage());
                $reportRun->markFailed('Failed to dispatch job: ' . $e->getMessage(), 0);
                
                // Fall through to sync processing
                $async = false;
            }
        }

        // Synchronous generation
        try {
            $reportRun = $this->reportService->generateReport($config, $data, $organizationId);

            return response()->json([
                'success' => true,
                'report_id' => $reportRun->id,
                'status' => $reportRun->status,
                'download_url' => $reportRun->isCompleted()
                    ? url("/api/reports/{$reportRun->id}/download")
                    : null,
                'file_name' => $reportRun->file_name,
                'file_size' => $reportRun->file_size_bytes,
                'duration_ms' => $reportRun->duration_ms,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get report status
     *
     * GET /api/reports/{id}/status
     */
    public function status(string $id)
    {
        $reportRun = ReportRun::find($id);

        if (!$reportRun) {
            return response()->json([
                'success' => false,
                'error' => 'Report not found',
            ], 404);
        }

        // Check authorization
        $profile = Auth::user()?->profile;
        if ($reportRun->organization_id && $reportRun->organization_id !== $profile?->organization_id) {
            return response()->json([
                'success' => false,
                'error' => 'Unauthorized',
            ], 403);
        }

        // Check if report has been pending for too long (5 minutes)
        // This handles cases where the queue worker isn't running
        if ($reportRun->status === ReportRun::STATUS_PENDING) {
            $pendingDuration = now()->diffInMinutes($reportRun->created_at);
            if ($pendingDuration >= 5) {
                // Mark as failed if pending for more than 5 minutes
                $reportRun->markFailed('Report generation timed out. Queue worker may not be running.', 0);
                \Log::warning("Report {$reportRun->id} has been pending for {$pendingDuration} minutes, marking as failed");
            }
        }

        return response()->json([
            'success' => true,
            'report_id' => $reportRun->id,
            'status' => $reportRun->status,
            'progress' => $reportRun->progress,
            'download_url' => $reportRun->isCompleted()
                ? url("/api/reports/{$reportRun->id}/download")
                : null,
            'file_name' => $reportRun->file_name,
            'file_size' => $reportRun->file_size_bytes,
            'duration_ms' => $reportRun->duration_ms,
            'error_message' => $reportRun->error_message,
            'created_at' => $reportRun->created_at?->toIso8601String(),
            'updated_at' => $reportRun->updated_at?->toIso8601String(),
        ]);
    }

    /**
     * Download generated report
     *
     * GET /api/reports/{id}/download
     */
    public function download(string $id)
    {
        \Log::debug('Download request received', [
            'report_id' => $id,
            'user_id' => Auth::id(),
        ]);

        $reportRun = ReportRun::find($id);

        if (!$reportRun) {
            \Log::warning('Report not found for download', ['report_id' => $id]);
            return response()->json([
                'success' => false,
                'error' => 'Report not found',
            ], 404);
        }

        // Check authorization
        $profile = Auth::user()?->profile;
        if ($reportRun->organization_id && $reportRun->organization_id !== $profile?->organization_id) {
            \Log::warning('Unauthorized download attempt', [
                'report_id' => $id,
                'report_org_id' => $reportRun->organization_id,
                'user_org_id' => $profile?->organization_id,
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Unauthorized',
            ], 403);
        }

        if (!$reportRun->isCompleted()) {
            \Log::warning('Report not completed for download', [
                'report_id' => $id,
                'status' => $reportRun->status,
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Report is not ready for download',
                'status' => $reportRun->status,
            ], 400);
        }

        // Check if file exists using both Storage facade and direct file check
        // Storage::exists() sometimes fails even when file exists, so we use direct file check as fallback
        $fileExists = false;
        $absolutePath = null;
        
        if ($reportRun->output_path) {
            // Try Storage facade first
            $fileExists = Storage::exists($reportRun->output_path);
            
            // If Storage::exists() returns false, try direct file check
            if (!$fileExists) {
                $absolutePath = storage_path('app/' . $reportRun->output_path);
                $fileExists = file_exists($absolutePath);
            }
        }

        \Log::debug('Checking report file', [
            'report_id' => $id,
            'output_path' => $reportRun->output_path,
            'storage_exists' => $reportRun->output_path ? Storage::exists($reportRun->output_path) : false,
            'file_exists' => $fileExists,
            'absolute_path' => $absolutePath,
        ]);

        if (!$reportRun->output_path || !$fileExists) {
            \Log::error('Report file not found', [
                'report_id' => $id,
                'output_path' => $reportRun->output_path,
                'status' => $reportRun->status,
                'file_name' => $reportRun->file_name,
                'storage_exists' => $reportRun->output_path ? Storage::exists($reportRun->output_path) : false,
                'file_exists' => $fileExists,
                'absolute_path' => $absolutePath,
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Report file not found',
            ], 404);
        }

        // Get file content - use direct file read if Storage::get() fails or returns empty
        $content = null;
        try {
            $content = Storage::get($reportRun->output_path);
            // Storage::get() can return empty string even when file exists, so check content length
            if (empty($content) || strlen($content) === 0) {
                \Log::warning('Storage::get() returned empty content, trying direct file read', [
                    'report_id' => $id,
                    'output_path' => $reportRun->output_path,
                ]);
                $content = null; // Reset to trigger fallback
            }
        } catch (\Exception $e) {
            \Log::warning('Storage::get() failed, trying direct file read', [
                'report_id' => $id,
                'output_path' => $reportRun->output_path,
                'error' => $e->getMessage(),
            ]);
            $content = null; // Reset to trigger fallback
        }
        
        // Fallback to direct file read if Storage::get() failed or returned empty
        if (!$content || strlen($content) === 0) {
            if ($absolutePath && file_exists($absolutePath)) {
                $content = file_get_contents($absolutePath);
            } elseif ($reportRun->output_path) {
                $absolutePath = storage_path('app/' . $reportRun->output_path);
                if (file_exists($absolutePath)) {
                    $content = file_get_contents($absolutePath);
                }
            }
        }

        if (!$content) {
            \Log::error('Could not read report file content', [
                'report_id' => $id,
                'output_path' => $reportRun->output_path,
                'absolute_path' => $absolutePath,
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Could not read report file',
            ], 500);
        }

        $mimeType = $reportRun->getMimeType();
        $fileName = $reportRun->file_name ?? "report.{$reportRun->getFileExtension()}";

        \Log::debug('Serving report file', [
            'report_id' => $id,
            'file_name' => $fileName,
            'file_size' => strlen($content),
            'mime_type' => $mimeType,
        ]);

        return response($content)
            ->header('Content-Type', $mimeType)
            ->header('Content-Disposition', "attachment; filename=\"{$fileName}\"")
            ->header('Content-Length', strlen($content));
    }

    /**
     * List report runs for the current user
     *
     * GET /api/reports
     */
    public function index(Request $request)
    {
        $profile = Auth::user()?->profile;
        $organizationId = $profile?->organization_id;

        $query = ReportRun::query();

        if ($organizationId) {
            $query->where('organization_id', $organizationId);
        }

        // Filter by user if not admin
        if (!Auth::user()?->hasPermissionTo('reports.view_all')) {
            $query->where('user_id', Auth::id());
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by report key
        if ($request->has('report_key')) {
            $query->where('report_key', $request->report_key);
        }

        // Filter by type
        if ($request->has('report_type')) {
            $query->where('report_type', $request->report_type);
        }

        // Order by created_at desc
        $query->orderBy('created_at', 'desc');

        // Paginate
        $perPage = $request->per_page ?? 20;
        $reports = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $reports->items(),
            'total' => $reports->total(),
            'current_page' => $reports->currentPage(),
            'per_page' => $reports->perPage(),
            'last_page' => $reports->lastPage(),
        ]);
    }

    /**
     * Delete a report run and its file
     *
     * DELETE /api/reports/{id}
     */
    public function destroy(string $id)
    {
        $reportRun = ReportRun::find($id);

        if (!$reportRun) {
            return response()->json([
                'success' => false,
                'error' => 'Report not found',
            ], 404);
        }

        // Check authorization
        $profile = Auth::user()?->profile;
        if ($reportRun->organization_id && $reportRun->organization_id !== $profile?->organization_id) {
            return response()->json([
                'success' => false,
                'error' => 'Unauthorized',
            ], 403);
        }

        // Only allow deleting own reports or with permission
        if ($reportRun->user_id !== Auth::id() && !Auth::user()?->hasPermissionTo('reports.delete_all')) {
            return response()->json([
                'success' => false,
                'error' => 'Unauthorized',
            ], 403);
        }

        // Delete file if exists
        if ($reportRun->output_path && Storage::exists($reportRun->output_path)) {
            Storage::delete($reportRun->output_path);
        }

        $reportRun->delete();

        return response()->json([
            'success' => true,
            'message' => 'Report deleted',
        ]);
    }

    /**
     * Preview report template in browser (HTML view)
     *
     * GET /api/reports/preview/template?template_name=table_a4_portrait&branding_id=...
     */
    public function previewTemplate(Request $request)
    {
        $templateName = $request->get('template_name', 'table_a4_portrait');
        $brandingId = $request->get('branding_id');
        $reportTemplateId = $request->get('report_template_id');
        $schoolId = $request->get('school_id'); // For getting default template if report_template_id not provided

        // Load branding if provided (no auth required for preview)
        // Force refresh cache if ?refresh=1 is in query string
        $branding = null;
        if ($brandingId) {
            try {
                $brandingCache = app(\App\Services\Reports\BrandingCacheService::class);
                $forceRefresh = $request->boolean('refresh'); // Properly handle refresh=1 query parameter
                if ($forceRefresh) {
                    $brandingCache->clearBrandingCache($brandingId);
                    \Log::info("Preview: Cleared cache for branding {$brandingId} due to refresh=1.");
                }
                $branding = $brandingCache->getBranding($brandingId, $forceRefresh);
                if (!$branding) {
                    \Log::warning("Preview: Branding {$brandingId} not found");
                } else {
                    \Log::debug("Preview: Branding loaded for {$brandingId}");
                    \Log::debug("  - primary_logo_uri: " . (isset($branding['primary_logo_uri']) && !empty($branding['primary_logo_uri']) ? "exists (" . strlen($branding['primary_logo_uri']) . " chars)" : "null"));
                    \Log::debug("  - secondary_logo_uri: " . (isset($branding['secondary_logo_uri']) && !empty($branding['secondary_logo_uri']) ? "exists (" . strlen($branding['secondary_logo_uri']) . " chars)" : "null"));
                    \Log::debug("  - ministry_logo_uri: " . (isset($branding['ministry_logo_uri']) && !empty($branding['ministry_logo_uri']) ? "exists (" . strlen($branding['ministry_logo_uri']) . " chars)" : "null"));
                    \Log::debug("  - show_primary_logo: " . (isset($branding['show_primary_logo']) ? ($branding['show_primary_logo'] ? 'true' : 'false') : 'not set'));
                    \Log::debug("  - show_secondary_logo: " . (isset($branding['show_secondary_logo']) ? ($branding['show_secondary_logo'] ? 'true' : 'false') : 'not set'));
                    \Log::debug("  - show_ministry_logo: " . (isset($branding['show_ministry_logo']) ? ($branding['show_ministry_logo'] ? 'true' : 'false') : 'not set'));
                    \Log::debug("  - report_logo_selection: " . (isset($branding['report_logo_selection']) ? $branding['report_logo_selection'] : 'not set'));
                    \Log::debug("  - primary_color: " . (isset($branding['primary_color']) ? $branding['primary_color'] : 'not set'));
                    \Log::debug("  - secondary_color: " . (isset($branding['secondary_color']) ? $branding['secondary_color'] : 'not set'));
                    \Log::debug("  - accent_color: " . (isset($branding['accent_color']) ? $branding['accent_color'] : 'not set'));
                    \Log::debug("  - font_family: " . (isset($branding['font_family']) ? $branding['font_family'] : 'not set'));
                    \Log::debug("  - report_font_size: " . (isset($branding['report_font_size']) ? $branding['report_font_size'] : 'not set'));
                    \Log::debug("  - primary_color: " . (isset($branding['primary_color']) ? $branding['primary_color'] : 'not set'));
                    \Log::debug("  - secondary_color: " . (isset($branding['secondary_color']) ? $branding['secondary_color'] : 'not set'));
                    \Log::debug("  - accent_color: " . (isset($branding['accent_color']) ? $branding['accent_color'] : 'not set'));
                }
            } catch (\Exception $e) {
                // If branding not found, use defaults
                \Log::error("Preview: Could not load branding {$brandingId}: " . $e->getMessage());
                \Log::error("Stack trace: " . $e->getTraceAsString());
            }
        }

        // Load ReportTemplate if provided
        $reportTemplate = null;
        $layout = [
            'page_size' => 'A4',
            'orientation' => 'portrait',
            'margins' => '15mm 12mm 18mm 12mm',
            'rtl' => true,
            'show_primary_logo' => true,
            'show_secondary_logo' => true,
            'show_ministry_logo' => false,
            'logo_height_px' => 60,
            'header_height_px' => 100,
            'header_layout_style' => 'three-column',
        ];

        if ($reportTemplateId) {
            $reportTemplate = \App\Models\ReportTemplate::with('watermark')
                ->where('id', $reportTemplateId)
                ->where('is_active', true)
                ->whereNull('deleted_at')
                ->first();
        } elseif ($schoolId) {
            // Try to get default template for the school
            // First try general_report type, then any default template
            $reportTemplate = \App\Models\ReportTemplate::with('watermark')
                ->where('school_id', $schoolId)
                ->where('template_type', 'general_report')
                ->where('is_active', true)
                ->where('is_default', true)
                ->whereNull('deleted_at')
                ->first();
            
            // If no general_report default, try any default template for this school
            if (!$reportTemplate) {
                $reportTemplate = \App\Models\ReportTemplate::with('watermark')
                    ->where('school_id', $schoolId)
                    ->where('is_active', true)
                    ->where('is_default', true)
                    ->whereNull('deleted_at')
                    ->first();
            }
            
            // If still no default, try any active template for general_report
            if (!$reportTemplate) {
                $reportTemplate = \App\Models\ReportTemplate::with('watermark')
                    ->where('school_id', $schoolId)
                    ->where('template_type', 'general_report')
                    ->where('is_active', true)
                    ->whereNull('deleted_at')
                    ->orderBy('created_at', 'desc')
                    ->first();
            }
        }

        // Merge report template settings if found
        if ($reportTemplate) {
            // Override header/footer HTML if provided by template
            if ($reportTemplate->header_html) {
                $layout['header_html'] = $reportTemplate->header_html;
            }
            if ($reportTemplate->footer_html) {
                $layout['footer_html'] = $reportTemplate->footer_html;
            }

            // Override header/footer text if provided
            if ($reportTemplate->header_text) {
                $layout['header_text'] = $reportTemplate->header_text;
            }
            if ($reportTemplate->header_text_position) {
                $layout['header_text_position'] = $reportTemplate->header_text_position;
            }
            if ($reportTemplate->footer_text) {
                $layout['footer_text'] = $reportTemplate->footer_text;
            }
            if ($reportTemplate->footer_text_position) {
                $layout['footer_text_position'] = $reportTemplate->footer_text_position;
            }

            // Override report settings if provided by template
            // Use individual boolean fields directly (like school branding)
            if ($reportTemplate->show_primary_logo !== null) {
                $layout['show_primary_logo'] = $reportTemplate->show_primary_logo;
            }
            if ($reportTemplate->show_secondary_logo !== null) {
                $layout['show_secondary_logo'] = $reportTemplate->show_secondary_logo;
            }
            if ($reportTemplate->show_ministry_logo !== null) {
                $layout['show_ministry_logo'] = $reportTemplate->show_ministry_logo;
            }
            
            // Override logo positions if provided by template
            if ($reportTemplate->primary_logo_position !== null) {
                $layout['primary_logo_position'] = $reportTemplate->primary_logo_position;
            }
            if ($reportTemplate->secondary_logo_position !== null) {
                $layout['secondary_logo_position'] = $reportTemplate->secondary_logo_position;
            }
            if ($reportTemplate->ministry_logo_position !== null) {
                $layout['ministry_logo_position'] = $reportTemplate->ministry_logo_position;
            }

            if ($reportTemplate->show_page_numbers !== null) {
                $layout['show_page_numbers'] = $reportTemplate->show_page_numbers;
            }

            if ($reportTemplate->show_generation_date !== null) {
                $layout['show_generation_date'] = $reportTemplate->show_generation_date;
            }

            if ($reportTemplate->table_alternating_colors !== null) {
                $layout['table_alternating_colors'] = $reportTemplate->table_alternating_colors;
            }

            if ($reportTemplate->report_font_size) {
                $layout['font_size'] = $reportTemplate->report_font_size;
            }
        }

        // Load watermark: Use template's watermark if set, otherwise use branding's default watermark
        $watermark = null;
        $noWatermarkSentinel = '00000000-0000-0000-0000-000000000000';
        
        // Check if template explicitly has no watermark (watermark_id is sentinel UUID)
        $hasNoWatermark = $reportTemplate && $reportTemplate->watermark_id === $noWatermarkSentinel;
        
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
                    \Log::debug("Preview: Using template's assigned watermark", [
                        'template_id' => $reportTemplate->id,
                        'watermark_id' => $watermark['id'] ?? null,
                        'wm_type' => $watermark['wm_type'] ?? null,
                    ]);
                }
            } catch (\Exception $e) {
                \Log::warning("Preview: Could not load template watermark: " . $e->getMessage());
            }
        }
        
        // If template explicitly has no watermark, don't load any watermark
        if ($hasNoWatermark) {
            \Log::debug("Preview: Template explicitly has no watermark set");
            $watermark = null;
        }
        // If no template watermark and not explicitly disabled, fall back to branding's default watermark
        elseif (!$watermark && $brandingId) {
            try {
                $brandingCache = app(\App\Services\Reports\BrandingCacheService::class);
                // Get default watermark for this branding (null report_key = default watermark)
                $watermark = $brandingCache->getWatermark($brandingId, null);
                
                if ($watermark) {
                    \Log::debug("Preview: Using branding's default watermark", [
                        'branding_id' => $brandingId,
                        'watermark_id' => $watermark['id'] ?? null,
                        'wm_type' => $watermark['wm_type'] ?? null,
                    ]);
                } else {
                    \Log::debug("Preview: No default watermark found for branding {$brandingId}");
                }
            } catch (\Exception $e) {
                \Log::warning("Preview: Could not load branding watermark: " . $e->getMessage());
            }
        }

        // Create mock context for preview (use real branding if available)
        $context = [
            // Branding (use real branding data if loaded)
            'SCHOOL_NAME' => ($branding && isset($branding['school_name'])) ? $branding['school_name'] : 'Sample School Name',
            'SCHOOL_NAME_PASHTO' => ($branding && isset($branding['school_name_pashto'])) ? $branding['school_name_pashto'] : 'د ښوونځي نوم',
            'SCHOOL_NAME_ARABIC' => ($branding && isset($branding['school_name_arabic'])) ? $branding['school_name_arabic'] : 'اسم المدرسة',
            'SCHOOL_ADDRESS' => ($branding && isset($branding['school_address'])) ? $branding['school_address'] : '123 Main Street, City, Country',
            'SCHOOL_PHONE' => ($branding && isset($branding['school_phone'])) ? $branding['school_phone'] : '+93 123 456 789',
            'SCHOOL_EMAIL' => ($branding && isset($branding['school_email'])) ? $branding['school_email'] : 'info@school.edu',
            'SCHOOL_WEBSITE' => ($branding && isset($branding['school_website'])) ? $branding['school_website'] : 'www.school.edu',
            // CRITICAL: Always use colors from branding, with fallback defaults
            'PRIMARY_COLOR' => ($branding && !empty($branding['primary_color'])) ? $branding['primary_color'] : '#0b0b56',
            'SECONDARY_COLOR' => ($branding && !empty($branding['secondary_color'])) ? $branding['secondary_color'] : '#0056b3',
            'ACCENT_COLOR' => ($branding && !empty($branding['accent_color'])) ? $branding['accent_color'] : '#ff6b35',
            'FONT_FAMILY' => ($branding && isset($branding['font_family']) && !empty(trim($branding['font_family']))) ? trim($branding['font_family']) : 'Bahij Nassim',
            // CRITICAL: Use template font size from layout first, then branding fallback
            'FONT_SIZE' => $layout['font_size'] ?? (($branding && isset($branding['report_font_size']) && !empty(trim($branding['report_font_size']))) ? trim($branding['report_font_size']) : '12px'),
            
            // Debug: Log what we're passing to template
            // Note: Remove this in production if not needed

            // Logos (use real logos from branding if available)
            'PRIMARY_LOGO_URI' => ($branding && isset($branding['primary_logo_uri']) && !empty($branding['primary_logo_uri'])) 
                ? $branding['primary_logo_uri'] 
                : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjMGIwYjU2Ii8+PHRleHQgeD0iNTAwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxPR088L3RleHQ+PC9zdmc+',
            'SECONDARY_LOGO_URI' => ($branding && isset($branding['secondary_logo_uri']) && !empty($branding['secondary_logo_uri'])) 
                ? $branding['secondary_logo_uri'] 
                : null,
            'MINISTRY_LOGO_URI' => ($branding && isset($branding['ministry_logo_uri']) && !empty($branding['ministry_logo_uri'])) 
                ? $branding['ministry_logo_uri'] 
                : null,
            // Use template logo settings first, then branding fallback
            'show_primary_logo' => $layout['show_primary_logo'] ?? (($branding && isset($branding['show_primary_logo'])) 
                ? (bool)$branding['show_primary_logo'] 
                : true),
            'show_secondary_logo' => $layout['show_secondary_logo'] ?? (($branding && isset($branding['show_secondary_logo'])) 
                ? (bool)$branding['show_secondary_logo'] 
                : false),
            'show_ministry_logo' => $layout['show_ministry_logo'] ?? (($branding && isset($branding['show_ministry_logo'])) 
                ? (bool)$branding['show_ministry_logo'] 
                : false),
            'primary_logo_position' => ($branding && isset($branding['primary_logo_position'])) 
                ? $branding['primary_logo_position'] 
                : 'left',
            'secondary_logo_position' => ($branding && isset($branding['secondary_logo_position'])) 
                ? $branding['secondary_logo_position'] 
                : 'right',
            'ministry_logo_position' => ($branding && isset($branding['ministry_logo_position'])) 
                ? $branding['ministry_logo_position'] 
                : 'right',
            // Header/footer text from template (overrides branding)
            'header_text' => $layout['header_text'] ?? (($branding && isset($branding['header_text']) && !empty($branding['header_text'])) 
                ? $branding['header_text'] 
                : null),
            'header_text_position' => $layout['header_text_position'] ?? 'below_school_name',
            'footer_text' => $layout['footer_text'] ?? null,
            'footer_text_position' => $layout['footer_text_position'] ?? 'footer',

            // Layout (from template or defaults)
            'page_size' => $layout['page_size'] ?? $request->get('page_size', 'A4'),
            'orientation' => $layout['orientation'] ?? $request->get('orientation', 'portrait'),
            'margins' => $layout['margins'] ?? '15mm 12mm 18mm 12mm',
            'rtl' => $layout['rtl'] ?? true,
            'logo_height_px' => $layout['logo_height_px'] ?? 90, // Larger logos for better visibility
            'header_height_px' => $layout['header_height_px'] ?? 100,
            'header_layout_style' => $layout['header_layout_style'] ?? 'three-column',
            'header_html' => $layout['header_html'] ?? null,
            'footer_html' => $layout['footer_html'] ?? null,
            'extra_css' => $layout['extra_css'] ?? null,
            // Report settings - CRITICAL: Use template settings from layout first, then branding fallback
            'table_alternating_colors' => $layout['table_alternating_colors'] ?? (($branding && isset($branding['table_alternating_colors'])) ? (bool)$branding['table_alternating_colors'] : true),

            // Watermark (from branding)
            'WATERMARK' => $watermark,
            
            // Report content
            'TABLE_TITLE' => $request->get('title', 'Sample Report Title'),
            'template_name' => $templateName,
            'COLUMNS' => [
                ['key' => 'name', 'label' => 'Name'],
                ['key' => 'class', 'label' => 'Class'],
                ['key' => 'status', 'label' => 'Status'],
            ],
            'COL_WIDTHS' => [30, 30, 40],
            'ROWS' => [
                ['name' => 'Sample Name 1', 'class' => '10A', 'status' => 'Active'],
                ['name' => 'Sample Name 2', 'class' => '10B', 'status' => 'Active'],
                ['name' => 'Sample Name 3', 'class' => '11A', 'status' => 'Inactive'],
                ['name' => 'Sample Name 4', 'class' => '11B', 'status' => 'Active'],
                ['name' => 'Sample Name 5', 'class' => '12A', 'status' => 'Active'],
            ],

            // Date
            'CURRENT_DATE' => now()->format('Y-m-d'),
            'CURRENT_DATETIME' => now()->format('Y-m-d H:i'),
            'CURRENT_DATE_NUMERIC' => now()->format('Y/m/d'),
            'CURRENT_DATE_SHORT' => now()->format('M d, Y'),

            // Notes
            'NOTES_HEADER' => [],
            'NOTES_BODY' => [],
            'NOTES_FOOTER' => [],

            // Watermark (loaded from branding above)
            'WATERMARK' => $watermark,

            // Page numbering - CRITICAL: Use template settings from layout first, then defaults
            'show_page_numbers' => $layout['show_page_numbers'] ?? true,
            'show_generation_date' => $layout['show_generation_date'] ?? true,
        ];

        // Debug: Log what's being passed to template
        \Log::debug("Preview template context:");
        \Log::debug("  - PRIMARY_LOGO_URI: " . (!empty($context['PRIMARY_LOGO_URI']) ? "exists (" . strlen($context['PRIMARY_LOGO_URI']) . " chars, starts with: " . substr($context['PRIMARY_LOGO_URI'], 0, 50) . "...)" : "null/empty"));
        \Log::debug("  - SECONDARY_LOGO_URI: " . (!empty($context['SECONDARY_LOGO_URI']) ? "exists (" . strlen($context['SECONDARY_LOGO_URI']) . " chars)" : "null/empty"));
        \Log::debug("  - MINISTRY_LOGO_URI: " . (!empty($context['MINISTRY_LOGO_URI']) ? "exists (" . strlen($context['MINISTRY_LOGO_URI']) . " chars)" : "null/empty"));
        \Log::debug("  - show_primary_logo: " . ($context['show_primary_logo'] ? 'true' : 'false'));
        \Log::debug("  - show_secondary_logo: " . ($context['show_secondary_logo'] ? 'true' : 'false'));
        \Log::debug("  - show_ministry_logo: " . ($context['show_ministry_logo'] ? 'true' : 'false'));
        
        // Additional validation: Check if PRIMARY_LOGO_URI is a valid data URI
        if (!empty($context['PRIMARY_LOGO_URI'])) {
            $uri = $context['PRIMARY_LOGO_URI'];
            if (strpos($uri, 'data:') === 0) {
                \Log::debug("  - PRIMARY_LOGO_URI is a valid data URI");
                // Extract base64 part
                $parts = explode(',', $uri, 2);
                if (count($parts) === 2) {
                    $base64Part = $parts[1];
                    $testDecode = @base64_decode($base64Part, true);
                    if ($testDecode !== false) {
                        \Log::debug("  - PRIMARY_LOGO_URI base64 decodes successfully, decoded size: " . strlen($testDecode) . " bytes");
                    } else {
                        \Log::error("  - PRIMARY_LOGO_URI base64 FAILED to decode!");
                    }
                }
            } else {
                \Log::warning("  - PRIMARY_LOGO_URI does not start with 'data:'");
            }
        }

        // Debug: Log what we're passing to template
        \Log::debug("Preview template context values:");
        \Log::debug("  - FONT_FAMILY: " . ($context['FONT_FAMILY'] ?? 'not set'));
        \Log::debug("  - FONT_SIZE: " . ($context['FONT_SIZE'] ?? 'not set'));
        \Log::debug("  - PRIMARY_COLOR: " . ($context['PRIMARY_COLOR'] ?? 'not set'));
        \Log::debug("  - SECONDARY_COLOR: " . ($context['SECONDARY_COLOR'] ?? 'not set'));
        \Log::debug("  - ACCENT_COLOR: " . ($context['ACCENT_COLOR'] ?? 'not set'));
        \Log::debug("  - WATERMARK: " . (!empty($context['WATERMARK']) ? "exists (type: " . ($context['WATERMARK']['wm_type'] ?? 'unknown') . ", active: " . ($context['WATERMARK']['is_active'] ?? false ? 'true' : 'false') . ")" : "null/empty"));

        // Render the template as HTML
        $viewName = "reports.{$templateName}";
        if (!\Illuminate\Support\Facades\View::exists($viewName)) {
            $viewName = 'reports.table_a4_portrait';
        }

        return view($viewName, $context);
    }

    /**
     * Build PDF report data from student history
     * CRITICAL: This method prepares data for the student-history.blade.php template
     * The template expects specific structure: student, summary, sections, labels, etc.
     */
    private function buildStudentHistoryPdfData(array $history): array
    {
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

        // Format summary data for template
        $summaryData = [
            'academic_years' => $summary['totalAcademicYears'] ?? 0,
            'attendance_rate' => round($summary['attendanceRate'] ?? 0, 2),
            'exam_average' => round($summary['averageExamScore'] ?? 0, 2),
            'total_fees_paid' => $summary['totalFeesPaid'] ?? 0,
            'library_loans' => $summary['totalLibraryLoans'] ?? 0,
            'courses_completed' => $summary['totalCoursesCompleted'] ?? 0,
        ];

        // Format admissions section (convert camelCase to snake_case)
        $admissionsData = array_map(function ($admission) {
            return [
                'academic_year' => $admission['academicYear']['name'] ?? '',
                'class' => $admission['class']['name'] ?? '',
                'class_academic_year_section_name' => $admission['classAcademicYearSectionName'] ?? '',
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

        // Return data structure that matches the template expectations
        return [
            // For ReportService (required structure)
            'columns' => [
                ['key' => 'section', 'label' => 'Section'],
                ['key' => 'value', 'label' => 'Value'],
            ],
            'rows' => [
                ['section' => 'Student', 'value' => $studentData['full_name']],
                ['section' => 'Admission No', 'value' => $studentData['admission_no']],
            ],
            
            // For student-history.blade.php template (custom data)
            'student' => $studentData,
            'summary' => $summaryData,
            'sections' => $sectionsData,
            'metadata' => $metadata,
            'generatedAt' => $metadata['generatedAt'] ?? now()->toISOString(),
            
            // Labels for translations (will be set by ReportService based on language)
            'labels' => [], // Will be populated by template based on language context
        ];
    }

    /**
     * Build Excel report data from student history
     */
    private function buildStudentHistoryExcelData(array $history): array
    {
        $student = $history['student'] ?? [];
        $summary = $history['summary'] ?? [];
        $sections = $history['sections'] ?? [];

        // For Excel, we'll create multiple sheets worth of data
        // CRITICAL: ExcelReportService expects sheets under parameters.sheets
        return [
            'student' => $student,
            'summary' => $summary,
            'columns' => [
                ['key' => 'placeholder', 'label' => 'Placeholder'],
            ],
            'rows' => [
                ['placeholder' => ''],
            ],
            'parameters' => [
                'sheets' => [
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
                ],
            ],
            'metadata' => $history['metadata'] ?? [],
        ];
    }
}
