<?php

namespace App\Http\Controllers;

use App\Models\ExamPaperTemplateFile;
use App\Services\ActivityLogService;
use App\Services\ExamPaperGeneratorService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class ExamPaperTemplateFileController extends Controller
{
    protected ExamPaperGeneratorService $generatorService;

    public function __construct(
        private ActivityLogService $activityLogService,
        ExamPaperGeneratorService $generatorService
    ) {
        $this->generatorService = $generatorService;
    }

    /**
     * Get all template files for the organization
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exams.papers.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.papers.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        try {
            $query = ExamPaperTemplateFile::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id);

            // Filter by language
            if ($request->filled('language')) {
                $query->where('language', $request->language);
            }

            // Filter by active status
            if ($request->filled('is_active')) {
                $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
            }

            // Filter by is_default
            if ($request->filled('is_default')) {
                $query->where('is_default', filter_var($request->is_default, FILTER_VALIDATE_BOOLEAN));
            }

            $templateFiles = $query->orderBy('language')
                ->orderBy('is_default', 'desc')
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json($templateFiles);
        } catch (\Exception $e) {
            Log::error('Error fetching template files: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'user_id' => $user->id,
                'organization_id' => $profile->organization_id,
            ]);
            return response()->json(['error' => 'Failed to fetch template files: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get a specific template file
     */
    public function show(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exams.papers.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.papers.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $templateFile = ExamPaperTemplateFile::where('organization_id', $profile->organization_id)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$templateFile) {
            return response()->json(['error' => 'Template file not found'], 404);
        }

        return response()->json($templateFile);
    }

    /**
     * Create a new template file
     */
    public function store(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exams.papers.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.papers.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'language' => ['required', 'string', Rule::in(['en', 'ps', 'fa', 'ar'])],
            'template_html' => 'required|string',
            'css_styles' => 'nullable|string|max:10000',
            'is_default' => 'boolean',
            'is_active' => 'boolean',
        ]);

        try {
            // If setting as default, unset other defaults for same language
            if ($validated['is_default'] ?? false) {
                ExamPaperTemplateFile::where('organization_id', $profile->organization_id)
                    ->where('language', $validated['language'])
                    ->whereNull('deleted_at')
                    ->update(['is_default' => false]);
            }

            $templateFile = ExamPaperTemplateFile::create([
                'organization_id' => $profile->organization_id,
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'language' => $validated['language'],
                'template_html' => $validated['template_html'],
                'css_styles' => $validated['css_styles'] ?? null,
                'is_default' => $validated['is_default'] ?? false,
                'is_active' => $validated['is_active'] ?? true,
            ]);

            // Log template file creation
            try {
                $this->activityLogService->logCreate(
                    subject: $templateFile,
                    description: "Created exam paper template file: {$templateFile->name} ({$templateFile->language})",
                    properties: [
                        'exam_paper_template_file_id' => $templateFile->id,
                        'name' => $templateFile->name,
                        'language' => $templateFile->language,
                    ],
                    request: $request
                );
            } catch (\Exception $e) {
                Log::warning('Failed to log template file creation: ' . $e->getMessage());
            }

            return response()->json($templateFile, 201);
        } catch (\Exception $e) {
            Log::error('Error creating template file: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'user_id' => $user->id,
                'organization_id' => $profile->organization_id,
            ]);
            return response()->json(['error' => 'Failed to create template file: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Update a template file
     */
    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exams.papers.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.papers.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $templateFile = ExamPaperTemplateFile::where('organization_id', $profile->organization_id)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$templateFile) {
            return response()->json(['error' => 'Template file not found'], 404);
        }

        // Capture old values before update
        $oldValues = $templateFile->only(['name', 'description', 'language', 'is_default', 'is_active']);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'language' => ['sometimes', 'required', 'string', Rule::in(['en', 'ps', 'fa', 'ar'])],
            'template_html' => 'sometimes|required|string',
            'css_styles' => 'nullable|string|max:10000',
            'is_default' => 'boolean',
            'is_active' => 'boolean',
        ]);

        try {
            // If setting as default, unset other defaults for same language
            if (isset($validated['is_default']) && $validated['is_default']) {
                ExamPaperTemplateFile::where('organization_id', $profile->organization_id)
                    ->where('language', $validated['language'] ?? $templateFile->language)
                    ->where('id', '!=', $id)
                    ->whereNull('deleted_at')
                    ->update(['is_default' => false]);
            }

            $templateFile->update($validated);

            // Log template file update
            try {
                $this->activityLogService->logUpdate(
                    subject: $templateFile,
                    description: "Updated exam paper template file: {$templateFile->name} ({$templateFile->language})",
                    properties: [
                        'exam_paper_template_file_id' => $templateFile->id,
                        'old_values' => $oldValues,
                        'new_values' => $templateFile->only(['name', 'description', 'language', 'is_default', 'is_active']),
                    ],
                    request: $request
                );
            } catch (\Exception $e) {
                Log::warning('Failed to log template file update: ' . $e->getMessage());
            }

            return response()->json($templateFile);
        } catch (\Exception $e) {
            Log::error('Error updating template file: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'template_file_id' => $id,
                'user_id' => $user->id,
            ]);
            return response()->json(['error' => 'Failed to update template file: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Delete a template file (soft delete)
     */
    public function destroy(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exams.papers.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.papers.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $templateFile = ExamPaperTemplateFile::where('organization_id', $profile->organization_id)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$templateFile) {
            return response()->json(['error' => 'Template file not found'], 404);
        }

        // Check if template file is in use
        $inUse = $templateFile->templates()->whereNull('deleted_at')->exists();
        if ($inUse) {
            return response()->json(['error' => 'This template file is in use and cannot be deleted'], 409);
        }

        // Log template file deletion
        try {
            $this->activityLogService->logDelete(
                subject: $templateFile,
                description: "Deleted exam paper template file: {$templateFile->name} ({$templateFile->language})",
                properties: [
                    'exam_paper_template_file_id' => $templateFile->id,
                    'name' => $templateFile->name,
                    'language' => $templateFile->language,
                    'deleted_entity' => $templateFile->toArray(),
                ],
                request: request()
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log template file deletion: ' . $e->getMessage());
        }

        try {
            $templateFile->delete();

            return response()->noContent();
        } catch (\Exception $e) {
            Log::error('Error deleting template file: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'template_file_id' => $id,
                'user_id' => $user->id,
            ]);
            return response()->json(['error' => 'Failed to delete template file: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Set template file as default for language
     */
    public function setDefault(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exams.papers.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.papers.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $templateFile = ExamPaperTemplateFile::where('organization_id', $profile->organization_id)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$templateFile) {
            return response()->json(['error' => 'Template file not found'], 404);
        }

        try {
            // Unset other defaults for same language
            ExamPaperTemplateFile::where('organization_id', $profile->organization_id)
                ->where('language', $templateFile->language)
                ->where('id', '!=', $id)
                ->whereNull('deleted_at')
                ->update(['is_default' => false]);

            $templateFile->update(['is_default' => true]);

            return response()->json($templateFile);
        } catch (\Exception $e) {
            Log::error('Error setting default template file: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'template_file_id' => $id,
                'user_id' => $user->id,
            ]);
            return response()->json(['error' => 'Failed to set default template file: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Generate preview HTML with sample data
     */
    public function preview(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('exams.papers.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.papers.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $templateFile = ExamPaperTemplateFile::where('organization_id', $profile->organization_id)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$templateFile) {
            return response()->json(['error' => 'Template file not found'], 404);
        }

        try {
            // Create sample template for preview
            $sampleTemplate = new \App\Models\ExamPaperTemplate([
                'id' => 'preview-' . $id,
                'organization_id' => $profile->organization_id,
                'school_id' => $profile->default_school_id ?? '',
                'title' => 'Sample Exam Paper',
                'language' => $templateFile->language,
                'duration_minutes' => 60,
                'total_marks' => 50,
                'instructions' => 'Sample instructions for preview.',
            ]);
            $sampleTemplate->setRelation('templateFile', $templateFile);

            // Sample items
            $sampleItems = [
                [
                    'question' => [
                        'text' => 'Sample MCQ question?',
                        'type' => 'mcq',
                        'marks' => 5,
                        'options' => [
                            ['text' => 'Option A'],
                            ['text' => 'Option B'],
                            ['text' => 'Option C'],
                            ['text' => 'Option D'],
                        ],
                    ],
                    'marks_override' => null,
                ],
                [
                    'question' => [
                        'text' => 'Sample short answer question?',
                        'type' => 'short',
                        'marks' => 10,
                    ],
                    'marks_override' => null,
                ],
            ];

            // Generate preview HTML
            $html = $this->generatorService->generatePaperHtml(
                $sampleTemplate,
                $sampleItems,
                1,
                \App\Models\Organization::find($profile->organization_id)
            );

            return response()->json([
                'html' => $html,
                'variant' => 1,
            ]);
        } catch (\Exception $e) {
            Log::error('Error generating preview: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'template_file_id' => $id,
                'user_id' => $user->id,
            ]);
            return response()->json(['error' => 'Failed to generate preview: ' . $e->getMessage()], 500);
        }
    }
}
