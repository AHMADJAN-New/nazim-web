<?php

namespace App\Http\Controllers\Dms;

use App\Models\LetterTemplate;
use App\Services\FieldMappingService;
use App\Services\DocumentRenderingService;
use Illuminate\Http\Request;

class LetterTemplatesController extends BaseDmsController
{
    protected FieldMappingService $fieldMappingService;
    protected DocumentRenderingService $renderingService;

    public function __construct(
        FieldMappingService $fieldMappingService,
        DocumentRenderingService $renderingService
    ) {
        $this->fieldMappingService = $fieldMappingService;
        $this->renderingService = $renderingService;
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

        // Get mock data for the recipient type
        $mockData = $this->fieldMappingService->getMockData($recipientType);

        // Merge with any custom variables from request
        $customVariables = $request->input('variables', []);
        $allData = array_merge($mockData, $customVariables);

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

        return response()->json([
            'html' => $renderedHtml,
            'template' => $template,
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
