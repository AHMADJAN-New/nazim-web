<?php

namespace App\Http\Controllers;

use App\Jobs\GenerateReportJob;
use App\Models\ReportRun;
use App\Services\Reports\ReportConfig;
use App\Services\Reports\ReportService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class ReportGenerationController extends Controller
{
    public function __construct(
        private ReportService $reportService
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
            'columns' => 'required|array',
            'columns.*' => 'required',
            'rows' => 'required|array',
            'async' => 'nullable|boolean',
        ]);

        // Get organization from authenticated user
        $profile = Auth::user()?->profile;
        $organizationId = $profile?->organization_id;

        // Create config
        $config = ReportConfig::fromArray([
            'report_key' => $validated['report_key'],
            'report_type' => $validated['report_type'],
            'branding_id' => $validated['branding_id'] ?? null,
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

        // Prepare data
        $data = [
            'columns' => $validated['columns'],
            'rows' => $validated['rows'],
        ];

        // Check if async is requested
        $async = $validated['async'] ?? false;

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

            // Dispatch job
            GenerateReportJob::dispatch($reportRun->id, $config->toArray(), $data);

            return response()->json([
                'success' => true,
                'report_id' => $reportRun->id,
                'status' => 'pending',
                'message' => 'Report generation started',
            ]);
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

        if (!$reportRun->isCompleted()) {
            return response()->json([
                'success' => false,
                'error' => 'Report is not ready for download',
                'status' => $reportRun->status,
            ], 400);
        }

        if (!$reportRun->output_path || !Storage::exists($reportRun->output_path)) {
            return response()->json([
                'success' => false,
                'error' => 'Report file not found',
            ], 404);
        }

        // Get file content
        $content = Storage::get($reportRun->output_path);
        $mimeType = $reportRun->getMimeType();
        $fileName = $reportRun->file_name ?? "report.{$reportRun->getFileExtension()}";

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
            'PRIMARY_COLOR' => ($branding && isset($branding['primary_color']) && !empty($branding['primary_color'])) ? $branding['primary_color'] : '#0b0b56',
            'SECONDARY_COLOR' => ($branding && isset($branding['secondary_color']) && !empty($branding['secondary_color'])) ? $branding['secondary_color'] : '#0056b3',
            'ACCENT_COLOR' => ($branding && isset($branding['accent_color']) && !empty($branding['accent_color'])) ? $branding['accent_color'] : '#ff6b35',
            'FONT_FAMILY' => ($branding && isset($branding['font_family']) && !empty(trim($branding['font_family']))) ? trim($branding['font_family']) : 'Bahij Nassim',
            'FONT_SIZE' => ($branding && isset($branding['report_font_size']) && !empty(trim($branding['report_font_size']))) ? trim($branding['report_font_size']) : '12px',
            
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
            // Use branding's logo visibility settings (already limited to max 2 logos)
            'show_primary_logo' => ($branding && isset($branding['show_primary_logo'])) 
                ? (bool)$branding['show_primary_logo'] 
                : true,
            'show_secondary_logo' => ($branding && isset($branding['show_secondary_logo'])) 
                ? (bool)$branding['show_secondary_logo'] 
                : false,
            'show_ministry_logo' => ($branding && isset($branding['show_ministry_logo'])) 
                ? (bool)$branding['show_ministry_logo'] 
                : false,
            'primary_logo_position' => ($branding && isset($branding['primary_logo_position'])) 
                ? $branding['primary_logo_position'] 
                : 'left',
            'secondary_logo_position' => ($branding && isset($branding['secondary_logo_position'])) 
                ? $branding['secondary_logo_position'] 
                : 'right',
            'ministry_logo_position' => ($branding && isset($branding['ministry_logo_position'])) 
                ? $branding['ministry_logo_position'] 
                : 'right',
            'HEADER_TEXT' => ($branding && isset($branding['header_text']) && !empty($branding['header_text'])) 
                ? $branding['header_text'] 
                : null,

            // Layout
            'page_size' => $request->get('page_size', 'A4'),
            'orientation' => $request->get('orientation', 'portrait'),
            'margins' => '15mm 12mm 18mm 12mm',
            'rtl' => true,
            'logo_height_px' => 90, // Larger logos for better visibility
            'header_height_px' => 100,
            'table_alternating_colors' => ($branding && isset($branding['table_alternating_colors'])) ? (bool)$branding['table_alternating_colors'] : true,

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

            // Watermark
            'WATERMARK' => null,

            // Page numbering
            'show_page_numbers' => true,
            'show_generation_date' => true,

            // Custom HTML
            'header_html' => null,
            'footer_html' => null,
            'extra_css' => null,
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

        // Render the template as HTML
        $viewName = "reports.{$templateName}";
        if (!\Illuminate\Support\Facades\View::exists($viewName)) {
            $viewName = 'reports.table_a4_portrait';
        }

        return view($viewName, $context);
    }
}
