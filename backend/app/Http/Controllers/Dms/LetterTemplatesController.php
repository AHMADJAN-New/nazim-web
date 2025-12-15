<?php

namespace App\Http\Controllers\Dms;

use App\Models\LetterTemplate;
use Illuminate\Http\Request;

class LetterTemplatesController extends BaseDmsController
{
    public function index(Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.templates.read');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        $this->authorize('viewAny', LetterTemplate::class);
        [, $profile] = $context;

        $query = LetterTemplate::where('organization_id', $profile->organization_id)
            ->with('letterhead');

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
            'letter_type' => ['nullable', 'string', 'max:50'],
            'body_html' => ['nullable', 'string'],
            'template_file_path' => ['nullable', 'string', 'max:255'],
            'template_file_type' => ['nullable', 'string', 'in:html,word,pdf,image'],
            'variables' => ['nullable', 'array'],
            'header_structure' => ['nullable', 'array'],
            'allow_edit_body' => ['boolean'],
            'default_security_level_key' => ['nullable', 'string'],
            'page_layout' => ['nullable', 'string'],
            'is_mass_template' => ['boolean'],
            'active' => ['boolean'],
            'school_id' => ['nullable', 'uuid'],
        ]);

        $data['organization_id'] = $profile->organization_id;

        $template = LetterTemplate::create($data);

        return response()->json($template, 201);
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
            'letter_type' => ['nullable', 'string', 'max:50'],
            'body_html' => ['nullable', 'string'],
            'template_file_path' => ['nullable', 'string', 'max:255'],
            'template_file_type' => ['nullable', 'string', 'in:html,word,pdf,image'],
            'variables' => ['nullable', 'array'],
            'header_structure' => ['nullable', 'array'],
            'allow_edit_body' => ['boolean'],
            'default_security_level_key' => ['nullable', 'string'],
            'page_layout' => ['nullable', 'string'],
            'is_mass_template' => ['boolean'],
            'active' => ['boolean'],
        ]);

        $template->fill($data);
        $template->save();

        return $template->load('letterhead');
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
            ->with('letterhead')
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

        return response()->json($newTemplate->load('letterhead'), 201);
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
            ->with('letterhead')
            ->firstOrFail();

        $this->authorize('view', $template);

        $mockVariables = $request->input('variables', []);
        $bodyHtml = $template->body_html ?? '';

        // Replace variables with mock values
        if (!empty($template->variables) && is_array($template->variables)) {
            foreach ($template->variables as $var) {
                $varName = is_array($var) ? ($var['name'] ?? $var) : $var;
                $varValue = $mockVariables[$varName] ?? ($var['default'] ?? "{{$varName}}");
                $bodyHtml = str_replace("{{$varName}}", $varValue, $bodyHtml);
                $bodyHtml = str_replace("{{ {$varName} }}", $varValue, $bodyHtml);
            }
        }

        // Use DocumentRenderingService to render with letterhead
        $renderingService = app(\App\Services\DocumentRenderingService::class);
        $letterheadHtml = '';
        
        if ($template->letterhead && method_exists($renderingService, 'processLetterheadFile')) {
            $letterheadHtml = $renderingService->processLetterheadFile($template->letterhead);
        }

        $renderedHtml = $renderingService->render($bodyHtml, [
            'letterhead_html' => $letterheadHtml,
            'page_layout' => $template->page_layout ?? 'A4_portrait',
        ]);

        return response()->json([
            'html' => $renderedHtml,
            'template' => $template,
        ]);
    }
}
