<?php

namespace App\Http\Controllers\Dms;

use App\Models\LetterTemplate;
use App\Models\Letterhead;
use App\Services\FieldMappingService;
use App\Services\DocumentRenderingService;
use App\Services\DocumentPdfService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class LetterTemplatesController extends BaseDmsController
{
    protected FieldMappingService $fieldMappingService;
    protected DocumentRenderingService $renderingService;
    protected DocumentPdfService $pdfService;

    public function __construct(
        FieldMappingService $fieldMappingService,
        DocumentRenderingService $renderingService,
        DocumentPdfService $pdfService
    ) {
        $this->fieldMappingService = $fieldMappingService;
        $this->renderingService = $renderingService;
        $this->pdfService = $pdfService;
    }

    public function index(Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.templates.read');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        $this->authorize('viewAny', LetterTemplate::class);
        [, $profile] = $context;

        $query = LetterTemplate::where('organization_id', $profile->organization_id)
            ->with(['letterhead', 'watermark']);

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }
        if ($request->filled('letter_type')) {
            $query->where('letter_type', $request->letter_type);
        }
        if ($request->filled('active')) {
            $query->where('active', $request->boolean('active'));
        }
        if ($request->filled('search')) {
            $query->where('name', 'ilike', '%' . $request->search . '%');
        }

        if ($request->boolean('paginate', false)) {
            $perPage = min(100, $request->integer('per_page', 20));
            return $query->orderBy('name')->paginate($perPage);
        }

        return $query->orderBy('name')->get();
    }

    public function store(Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.templates.create');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        $this->authorize('create', LetterTemplate::class);
        [, $profile] = $context;

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string'],
            'letterhead_id' => ['nullable', 'uuid', 'exists:letterheads,id'],
            'watermark_id' => ['nullable', 'uuid', 'exists:letterheads,id'],
            'letter_type' => ['nullable', 'string', 'max:50'],
            'body_text' => ['nullable', 'string'],
            'variables' => ['nullable', 'array'],
            'supports_tables' => ['boolean'],
            'table_structure' => ['nullable', 'array'],
            'field_positions' => ['nullable', 'array'],
            'default_security_level_key' => ['nullable', 'string'],
            'page_layout' => ['nullable', 'string'],
            'repeat_letterhead_on_pages' => ['boolean'],
            'is_mass_template' => ['boolean'],
            'active' => ['boolean'],
            'school_id' => ['nullable', 'uuid'],
        ]);

        $data['organization_id'] = $profile->organization_id;

        $template = LetterTemplate::create($data);

        return response()->json($template->load(['letterhead', 'watermark']), 201);
    }

    public function update(string $id, Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.templates.update');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile] = $context;

        $template = LetterTemplate::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->firstOrFail();

        $this->authorize('update', $template);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'category' => ['sometimes', 'string'],
            'letterhead_id' => ['nullable', 'uuid', 'exists:letterheads,id'],
            'watermark_id' => ['nullable', 'uuid', 'exists:letterheads,id'],
            'letter_type' => ['nullable', 'string', 'max:50'],
            'body_text' => ['nullable', 'string'],
            'variables' => ['nullable', 'array'],
            'supports_tables' => ['boolean'],
            'table_structure' => ['nullable', 'array'],
            'field_positions' => ['nullable', 'array'],
            'default_security_level_key' => ['nullable', 'string'],
            'page_layout' => ['nullable', 'string'],
            'repeat_letterhead_on_pages' => ['boolean'],
            'is_mass_template' => ['boolean'],
            'active' => ['boolean'],
        ]);

        $template->fill($data);
        $template->save();

        return $template->load(['letterhead', 'watermark']);
    }

    public function show(string $id, Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.templates.read');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile] = $context;

        $template = LetterTemplate::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->with(['letterhead', 'watermark'])
            ->firstOrFail();

        $this->authorize('view', $template);

        return $template;
    }

    public function destroy(string $id, Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.templates.delete');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile] = $context;

        $template = LetterTemplate::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->firstOrFail();

        $this->authorize('delete', $template);

        // Check if template is in use
        $inUse = \App\Models\OutgoingDocument::where('template_id', $id)
            ->exists();

        if ($inUse) {
            return response()->json(['error' => 'This template is in use and cannot be deleted'], 409);
        }

        $template->delete();

        return response()->noContent();
    }

    public function duplicate(string $id, Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.templates.create');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        $this->authorize('create', LetterTemplate::class);
        [, $profile] = $context;

        $original = LetterTemplate::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->firstOrFail();

        $this->authorize('view', $original);

        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
        ]);

        $newTemplate = $original->replicate();
        $newTemplate->name = $data['name'] ?? $original->name . ' (Copy)';
        $newTemplate->active = false; // Duplicates are inactive by default
        $newTemplate->save();

        return response()->json($newTemplate->load(['letterhead', 'watermark']), 201);
    }

    public function preview(string $id, Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.templates.read');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile] = $context;

        $template = LetterTemplate::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->with(['letterhead', 'watermark'])
            ->firstOrFail();

        $this->authorize('view', $template);

        // Get recipient type from request or use category
        $recipientType = $request->input('recipient_type', $template->category);
        $recipientId = $request->input('recipient_id');

        // Get actual recipient data if recipient_id is provided, otherwise use mock data
        if ($recipientId) {
            $actualData = $this->fieldMappingService->buildVariablesForOutgoingDocument(
                $recipientType,
                $recipientId,
                [],
                []
            );
            $mockData = []; // Don't use mock data when we have actual data
        } else {
            $actualData = [];
            $mockData = $this->fieldMappingService->getMockData($recipientType);
        }

        // Merge with any custom variables from request (custom variables override actual/mock data)
        $customVariables = $request->input('variables', []);
        $allData = array_merge($mockData, $actualData, $customVariables);

        // Filter out null values and ensure all values are strings
        $allData = array_filter($allData, fn($value) => $value !== null);
        $allData = array_map(fn($value) => $value !== null && $value !== '' ? (string) $value : '', $allData);

        // Debug: Log variables being used (only in development)
        if (config('app.debug')) {
            \Log::debug('Template preview variables', [
                'template_id' => $template->id,
                'recipient_type' => $recipientType,
                'recipient_id' => $recipientId,
                'variables_count' => count($allData),
                'variable_keys' => array_keys($allData),
                'has_custom_variables' => !empty($customVariables),
            ]);
        }

        // Replace placeholders in body_text
        $bodyText = $template->body_text ?? '';
        $processedText = $this->renderingService->replaceTemplateVariables($bodyText, $allData);

        // Build table payload if template supports tables
        $tablePayload = null;
        if ($template->supports_tables && !empty($template->table_structure)) {
            $tablePayload = $request->input('table_payload', $template->table_structure);
        }

        // Render the document for browser preview (use HTTP URLs instead of file://)
        $renderedHtml = $this->renderingService->render($template, $processedText, [
            'table_payload' => $tablePayload,
            'for_browser' => true, // Use HTTP URLs for browser preview
        ]);

        // Debug: Log letterhead info (only in development)
        if (config('app.debug')) {
            \Log::debug('Template preview generated', [
                'template_id' => $template->id,
                'has_letterhead' => $template->letterhead !== null,
                'letterhead_id' => $template->letterhead?->id,
                'letterhead_file_path' => $template->letterhead?->file_path,
                'html_length' => strlen($renderedHtml),
                'html_contains_letterhead' => str_contains($renderedHtml, 'letterhead-background') || str_contains($renderedHtml, 'letterhead-header'),
            ]);
        }

        return response()->json([
            'html' => $renderedHtml,
            'template' => $template,
            'mock_data' => $mockData,
        ]);
    }

    /**
     * Generate PDF from template preview (for printing before issuing)
     */
    public function previewPdf(string $id, Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.templates.read');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile] = $context;

        $template = LetterTemplate::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->with(['letterhead', 'watermark'])
            ->firstOrFail();

        $this->authorize('view', $template);

        // Get recipient type from request or use category
        $recipientType = $request->input('recipient_type', $template->category);
        $recipientId = $request->input('recipient_id');

        // Get actual recipient data if recipient_id is provided, otherwise use mock data
        if ($recipientId) {
            $actualData = $this->fieldMappingService->buildVariablesForOutgoingDocument(
                $recipientType,
                $recipientId,
                [],
                []
            );
            $mockData = [];
        } else {
            $actualData = [];
            $mockData = $this->fieldMappingService->getMockData($recipientType);
        }

        // Merge with any custom variables from request
        $customVariables = $request->input('variables', []);
        $allData = array_merge($mockData, $actualData, $customVariables);

        // Filter out null values and ensure all values are strings
        $allData = array_filter($allData, fn($value) => $value !== null);
        $allData = array_map(fn($value) => $value !== null && $value !== '' ? (string) $value : '', $allData);

        // Replace placeholders in body_text
        $bodyText = $template->body_text ?? '';
        $processedText = $this->renderingService->replaceTemplateVariables($bodyText, $allData);

        // Build table payload if template supports tables
        $tablePayload = null;
        if ($template->supports_tables && !empty($template->table_structure)) {
            $tablePayload = $request->input('table_payload', $template->table_structure);
        }

        // Render the document for PDF generation (not for browser)
        $html = $this->renderingService->render($template, $processedText, [
            'table_payload' => $tablePayload,
            'for_browser' => false, // Use base64 data URLs for PDF generation
        ]);

        // Debug: Log letterhead info (only in development)
        if (config('app.debug')) {
            \Log::debug('Preview PDF generation', [
                'template_id' => $template->id,
                'has_letterhead' => $template->letterhead !== null,
                'letterhead_id' => $template->letterhead?->id,
                'letterhead_file_path' => $template->letterhead?->file_path,
                'html_length' => strlen($html),
                'html_contains_letterhead' => str_contains($html, 'letterhead-background') || str_contains($html, 'letterhead-header'),
                'html_contains_data_url' => str_contains($html, 'data:image') || str_contains($html, 'data:application/pdf'),
            ]);
        }

        try {
            // Generate PDF in temp directory
            $directory = 'dms/temp';
            $pdfPath = $this->pdfService->generate($html, $template->page_layout ?? 'A4_portrait', $directory);

            // Return PDF file
            return Storage::download($pdfPath, 'letter-preview.pdf');
        } catch (\Exception $e) {
            \Log::error('Failed to generate preview PDF', [
                'template_id' => $template->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'error' => 'Failed to generate PDF: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Preview a draft (unsaved) template payload.
     *
     * This enables "actual preview" inside the create/edit dialog without requiring a template ID yet.
     */
    public function previewDraft(Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.templates.read');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        $this->authorize('viewAny', LetterTemplate::class);
        [, $profile] = $context;

        $data = $request->validate([
            'template' => ['required', 'array'],
            'template.category' => ['required', 'string', 'max:255'],
            'template.body_text' => ['nullable', 'string'],
            'template.letterhead_id' => ['nullable', 'uuid', 'exists:letterheads,id'],
            'template.watermark_id' => ['nullable', 'uuid', 'exists:letterheads,id'],
            'template.page_layout' => ['nullable', 'string', 'max:50'],
            'template.repeat_letterhead_on_pages' => ['nullable', 'boolean'],
            'template.field_positions' => ['nullable', 'array'],
            'template.supports_tables' => ['nullable', 'boolean'],
            'template.table_structure' => ['nullable', 'array'],
            'recipient_type' => ['nullable', 'string', 'max:255'],
            'variables' => ['nullable', 'array'],
            'table_payload' => ['nullable', 'array'],
        ]);

        $templatePayload = $data['template'];

        $template = new LetterTemplate();
        $template->organization_id = $profile->organization_id;
        $template->category = $templatePayload['category'];
        $template->body_text = $templatePayload['body_text'] ?? '';
        $template->letterhead_id = $templatePayload['letterhead_id'] ?? null;
        $template->watermark_id = $templatePayload['watermark_id'] ?? null;
        $template->page_layout = $templatePayload['page_layout'] ?? 'A4_portrait';
        $template->repeat_letterhead_on_pages = $templatePayload['repeat_letterhead_on_pages'] ?? true;
        $template->field_positions = $templatePayload['field_positions'] ?? [];
        $template->supports_tables = $templatePayload['supports_tables'] ?? false;
        $template->table_structure = $templatePayload['table_structure'] ?? null;

        if (!empty($template->letterhead_id)) {
            $letterhead = Letterhead::where('organization_id', $profile->organization_id)->find($template->letterhead_id);
            if ($letterhead) {
                $template->setRelation('letterhead', $letterhead);
            }
        }

        if (!empty($template->watermark_id)) {
            $watermark = Letterhead::where('organization_id', $profile->organization_id)->find($template->watermark_id);
            if ($watermark) {
                $template->setRelation('watermark', $watermark);
            }
        }

        $recipientType = $data['recipient_type'] ?? $template->category;
        $mockData = $this->fieldMappingService->getMockData($recipientType);
        $customVariables = $data['variables'] ?? [];
        $allData = array_merge($mockData, $customVariables);

        $processedText = $this->renderingService->replaceTemplateVariables($template->body_text ?? '', $allData);

        $tablePayload = $data['table_payload'] ?? null;
        if (!$tablePayload && $template->supports_tables && !empty($template->table_structure)) {
            $tablePayload = $template->table_structure;
        }

        $renderedHtml = $this->renderingService->render($template, $processedText, [
            'table_payload' => $tablePayload,
            'for_browser' => true,
        ]);

        return response()->json([
            'html' => $renderedHtml,
            'mock_data' => $mockData,
        ]);
    }

    /**
     * Get available fields for a given recipient type
     */
    public function getAvailableFields(Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.templates.read');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }

        $recipientType = $request->input('recipient_type', 'general');

        $fields = $this->fieldMappingService->getAvailableFields($recipientType);

        // Group fields by their group property
        $groupedFields = collect($fields)->groupBy('group')->toArray();

        return response()->json([
            'fields' => $fields,
            'grouped_fields' => $groupedFields,
            'recipient_type' => $recipientType,
        ]);
    }
}
