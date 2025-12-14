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

        $query = LetterTemplate::where('organization_id', $profile->organization_id);
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }
        if ($request->filled('active')) {
            $query->where('active', $request->boolean('active'));
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
            'body_html' => ['nullable', 'string'],
            'variables' => ['nullable', 'array'],
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
            'body_html' => ['nullable', 'string'],
            'variables' => ['nullable', 'array'],
            'allow_edit_body' => ['boolean'],
            'default_security_level_key' => ['nullable', 'string'],
            'page_layout' => ['nullable', 'string'],
            'is_mass_template' => ['boolean'],
            'active' => ['boolean'],
        ]);

        $template->fill($data);
        $template->save();

        return $template;
    }
}
