<?php

namespace App\Http\Controllers\Certificates;

use App\Http\Controllers\Controller;
use App\Models\CertificateTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class CertificateTemplateController extends Controller
{
    private function getProfile($user)
    {
        return DB::table('profiles')->where('id', (string) $user->id)->first();
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (!$user->hasPermissionTo('certificate_templates.read')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $query = CertificateTemplate::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at');

        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }

        return response()->json($query->orderByDesc('created_at')->get());
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (!$user->hasPermissionTo('certificate_templates.create')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $validated = $request->validate([
            'type' => 'required|string|in:graduation,promotion,completion,merit,appreciation',
            'title' => 'required|string|max:255',
            'body_html' => 'nullable|string',
            'layout_config' => 'nullable|json',
            'description' => 'nullable|string|max:1000',
            'page_size' => 'nullable|string|in:A4,A5,custom',
            'custom_width_mm' => 'nullable|numeric|min:10',
            'custom_height_mm' => 'nullable|numeric|min:10',
            'rtl' => 'nullable|boolean',
            'font_family' => 'nullable|string|max:255',
            'background_image' => 'nullable|image|max:5120',
            'is_active' => 'nullable|boolean',
        ]);

        $schoolId = $currentSchoolId;

        $backgroundPath = null;
        if ($request->hasFile('background_image')) {
            $backgroundPath = $request->file('background_image')->store('certificate-templates/' . $profile->organization_id . '/' . $schoolId, 'local');
        }

        // Parse layout_config if provided
        $layoutConfig = null;
        if ($request->has('layout_config')) {
            $layoutConfigJson = $request->input('layout_config');
            if (is_string($layoutConfigJson)) {
                $layoutConfig = json_decode($layoutConfigJson, true);
            } else {
                $layoutConfig = $layoutConfigJson;
            }
        }

        $template = CertificateTemplate::create([
            'organization_id' => $profile->organization_id,
            'school_id' => $schoolId,
            'type' => $validated['type'],
            'name' => $validated['title'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'body_html' => $validated['body_html'] ?? null,
            'layout_config' => $layoutConfig,
            'page_size' => $validated['page_size'] ?? 'A4',
            'custom_width_mm' => $validated['custom_width_mm'] ?? null,
            'custom_height_mm' => $validated['custom_height_mm'] ?? null,
            'rtl' => $validated['rtl'] ?? true,
            'font_family' => $validated['font_family'] ?? null,
            'background_image_path' => $backgroundPath,
            'is_active' => $validated['is_active'] ?? true,
            'created_by' => (string) $user->id,
        ]);

        return response()->json($template, 201);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (!$user->hasPermissionTo('certificate_templates.update')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $template = CertificateTemplate::where('organization_id', $profile->organization_id)
            ->where('school_id', $this->getCurrentSchoolId($request))
            ->whereNull('deleted_at')
            ->find($id);

        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        $validated = $request->validate([
            'type' => 'nullable|string|in:graduation,promotion,completion,merit,appreciation',
            'title' => 'nullable|string|max:255',
            'body_html' => 'nullable|string',
            'layout_config' => 'nullable|json',
            'description' => 'nullable|string|max:1000',
            'page_size' => 'nullable|string|in:A4,A5,custom',
            'custom_width_mm' => 'nullable|numeric|min:10',
            'custom_height_mm' => 'nullable|numeric|min:10',
            'rtl' => 'nullable|boolean',
            'font_family' => 'nullable|string|max:255',
            'background_image' => 'nullable|image|max:5120',
            'is_active' => 'nullable|boolean',
        ]);

        if ($request->hasFile('background_image')) {
            try {
                if ($template->background_image_path && Storage::exists($template->background_image_path)) {
                    Storage::delete($template->background_image_path);
                }
                $validated['background_image_path'] = $request->file('background_image')->store('certificate-templates/' . $profile->organization_id . '/' . $template->school_id, 'local');
            } catch (\Exception $e) {
                Log::error('Certificate template background upload failed', ['error' => $e->getMessage()]);
            }
        }

        // Parse layout_config if provided
        if ($request->has('layout_config')) {
            $layoutConfigJson = $request->input('layout_config');
            if (is_string($layoutConfigJson)) {
                $validated['layout_config'] = json_decode($layoutConfigJson, true);
            } else {
                $validated['layout_config'] = $layoutConfigJson;
            }
        }

        unset($validated['background_image']);

        $template->update($validated);
        $template->updated_by = (string) $user->id;
        $template->save();

        return response()->json($template->fresh());
    }

    public function show(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (!$user->hasPermissionTo('certificate_templates.read')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $template = CertificateTemplate::where('organization_id', $profile->organization_id)
            ->where('school_id', $this->getCurrentSchoolId($request))
            ->whereNull('deleted_at')
            ->find($id);

        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        return response()->json($template);
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (!$user->hasPermissionTo('certificate_templates.delete')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $template = CertificateTemplate::where('organization_id', $profile->organization_id)
            ->where('school_id', $this->getCurrentSchoolId($request))
            ->whereNull('deleted_at')
            ->find($id);

        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        // Soft delete
        $template->delete();

        return response()->noContent();
    }

    public function getBackgroundImage(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (!$user->hasPermissionTo('certificate_templates.read')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $template = CertificateTemplate::where('organization_id', $profile->organization_id)
            ->where('school_id', $this->getCurrentSchoolId($request))
            ->whereNull('deleted_at')
            ->find($id);

        if (!$template || !$template->background_image_path) {
            return response()->json(['error' => 'Background image not found'], 404);
        }

        if (!Storage::exists($template->background_image_path)) {
            return response()->json(['error' => 'Background image file not found'], 404);
        }

        return Storage::response($template->background_image_path);
    }

    public function activate(Request $request, string $id)
    {
        return $this->toggleActive($request, $id, true);
    }

    public function deactivate(Request $request, string $id)
    {
        return $this->toggleActive($request, $id, false);
    }

    private function toggleActive(Request $request, string $id, bool $isActive)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (!$user->hasPermissionTo('certificate_templates.update')) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $template = CertificateTemplate::where('organization_id', $profile->organization_id)
            ->where('school_id', $this->getCurrentSchoolId($request))
            ->whereNull('deleted_at')
            ->find($id);

        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        $template->is_active = $isActive;
        $template->updated_by = (string) $user->id;
        $template->save();

        return response()->json($template);
    }
}
