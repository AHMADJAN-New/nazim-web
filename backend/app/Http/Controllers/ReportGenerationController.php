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
}
