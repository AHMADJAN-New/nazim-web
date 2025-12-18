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

        $query = CertificateTemplate::where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at');

        if ($request->filled('school_id')) {
            $query->where(function ($q) use ($request) {
                $q->whereNull('school_id')->orWhere('school_id', $request->input('school_id'));
            });
        }

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

        $validated = $request->validate([
            'school_id' => 'nullable|uuid|exists:school_branding,id',
            'type' => 'required|string|in:graduation,promotion,completion,merit,appreciation',
            'title' => 'required|string|max:255',
            'body_html' => 'required|string',
            'page_size' => 'nullable|string|in:A4,A5,custom',
            'custom_width_mm' => 'nullable|numeric|min:10',
            'custom_height_mm' => 'nullable|numeric|min:10',
            'rtl' => 'nullable|boolean',
            'font_family' => 'nullable|string|max:255',
            'background_image' => 'nullable|image|max:5120',
            'is_active' => 'nullable|boolean',
        ]);

        // If school_id is provided, verify it belongs to the user's organization
        $schoolId = $validated['school_id'] ?? $profile->default_school_id;
        if ($schoolId) {
            $schoolBelongsToOrg = DB::table('school_branding')
                ->where('id', $schoolId)
                ->where('organization_id', $profile->organization_id)
                ->exists();
            if (!$schoolBelongsToOrg) {
                return response()->json(['error' => 'School does not belong to your organization'], 403);
            }
        }

        $backgroundPath = null;
        if ($request->hasFile('background_image')) {
            $backgroundPath = $request->file('background_image')->store('certificate-templates/' . $profile->organization_id, 'local');
        }

        $template = CertificateTemplate::create([
            'organization_id' => $profile->organization_id,
            'school_id' => $schoolId,
            'type' => $validated['type'],
            'name' => $validated['title'],
            'title' => $validated['title'],
            'body_html' => $validated['body_html'],
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
            ->whereNull('deleted_at')
            ->find($id);

        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        $validated = $request->validate([
            'school_id' => 'nullable|uuid|exists:school_branding,id',
            'type' => 'nullable|string|in:graduation,promotion,completion,merit,appreciation',
            'title' => 'nullable|string|max:255',
            'body_html' => 'nullable|string',
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
                $validated['background_image_path'] = $request->file('background_image')->store('certificate-templates/' . $profile->organization_id, 'local');
            } catch (\Exception $e) {
                Log::error('Certificate template background upload failed', ['error' => $e->getMessage()]);
            }
        }

        unset($validated['background_image']);

        $template->update($validated);
        $template->updated_by = (string) $user->id;
        $template->save();

        return response()->json($template->fresh());
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
