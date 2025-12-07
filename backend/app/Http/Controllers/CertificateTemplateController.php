<?php

namespace App\Http\Controllers;

use App\Models\CertificateTemplate;
use App\Models\CourseStudent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

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

        try {
            if (!$user->hasPermissionTo('certificate_templates.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CertificateTemplateController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $query = CertificateTemplate::where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at');

        if ($request->filled('active_only') && $request->active_only === 'true') {
            $query->where('is_active', true);
        }

        return response()->json($query->orderBy('is_default', 'desc')->orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('certificate_templates.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'background_image' => 'nullable|image|max:5120', // 5MB max
            'layout_config' => 'nullable|array',
            'is_default' => 'boolean',
            'is_active' => 'boolean',
        ]);

        $backgroundPath = null;
        if ($request->hasFile('background_image')) {
            $file = $request->file('background_image');
            $fileName = Str::uuid() . '.' . $file->getClientOriginalExtension();
            $backgroundPath = $file->storeAs(
                'certificate-templates/' . $profile->organization_id,
                $fileName,
                'local'
            );
        }

        // If this is marked as default, unset other defaults
        if (!empty($validated['is_default'])) {
            CertificateTemplate::where('organization_id', $profile->organization_id)
                ->where('is_default', true)
                ->update(['is_default' => false]);
        }

        $template = CertificateTemplate::create([
            'organization_id' => $profile->organization_id,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'background_image_path' => $backgroundPath,
            'layout_config' => $validated['layout_config'] ?? CertificateTemplate::getDefaultLayout(),
            'is_default' => $validated['is_default'] ?? false,
            'is_active' => $validated['is_active'] ?? true,
            'created_by' => (string) $user->id,
        ]);

        return response()->json($template, 201);
    }

    public function show(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $template = CertificateTemplate::where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        return response()->json($template);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('certificate_templates.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $template = CertificateTemplate::where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'background_image' => 'nullable|image|max:5120',
            'layout_config' => 'nullable|array',
            'is_default' => 'boolean',
            'is_active' => 'boolean',
        ]);

        if ($request->hasFile('background_image')) {
            // Delete old background if exists
            if ($template->background_image_path && Storage::disk('local')->exists($template->background_image_path)) {
                Storage::disk('local')->delete($template->background_image_path);
            }

            $file = $request->file('background_image');
            $fileName = Str::uuid() . '.' . $file->getClientOriginalExtension();
            $validated['background_image_path'] = $file->storeAs(
                'certificate-templates/' . $profile->organization_id,
                $fileName,
                'local'
            );
        }
        unset($validated['background_image']);

        // If this is marked as default, unset other defaults
        if (!empty($validated['is_default']) && !$template->is_default) {
            CertificateTemplate::where('organization_id', $profile->organization_id)
                ->where('id', '!=', $id)
                ->where('is_default', true)
                ->update(['is_default' => false]);
        }

        $template->update($validated);

        return response()->json($template->fresh());
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('certificate_templates.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $template = CertificateTemplate::where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        // Check if template is in use
        $inUseCount = CourseStudent::where('certificate_template_id', $id)->count();
        if ($inUseCount > 0) {
            return response()->json([
                'error' => "Cannot delete template. It is used by {$inUseCount} certificate(s)."
            ], 422);
        }

        // Delete background image if exists
        if ($template->background_image_path && Storage::disk('local')->exists($template->background_image_path)) {
            Storage::disk('local')->delete($template->background_image_path);
        }

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

        $template = CertificateTemplate::where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$template || !$template->background_image_path) {
            return response()->json(['error' => 'Background image not found'], 404);
        }

        if (!Storage::disk('local')->exists($template->background_image_path)) {
            return response()->json(['error' => 'File not found on storage'], 404);
        }

        $mimeType = Storage::disk('local')->mimeType($template->background_image_path);
        return Storage::disk('local')->response($template->background_image_path, null, [
            'Content-Type' => $mimeType,
        ]);
    }

    public function setDefault(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('certificate_templates.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $template = CertificateTemplate::where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        // Unset other defaults
        CertificateTemplate::where('organization_id', $profile->organization_id)
            ->where('id', '!=', $id)
            ->where('is_default', true)
            ->update(['is_default' => false]);

        $template->update(['is_default' => true]);

        return response()->json($template->fresh());
    }

    public function generateCertificate(Request $request, string $courseStudentId)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('course_students.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $student = CourseStudent::where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->with(['course'])
            ->find($courseStudentId);

        if (!$student) {
            return response()->json(['error' => 'Course student not found'], 404);
        }

        $validated = $request->validate([
            'template_id' => 'required|uuid|exists:certificate_templates,id',
        ]);

        $template = CertificateTemplate::where('organization_id', $profile->organization_id)
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->find($validated['template_id']);

        if (!$template) {
            return response()->json(['error' => 'Template not found or inactive'], 404);
        }

        // Generate certificate number if not exists
        if (!$student->certificate_number) {
            $student->certificate_number = $this->generateCertificateNumber($profile->organization_id, $student->course_id);
        }

        $student->certificate_template_id = $template->id;
        $student->certificate_issued_at = now();
        $student->save();

        // Return certificate data for frontend PDF generation
        return response()->json([
            'student' => $student->load(['course']),
            'template' => $template,
            'background_url' => $template->background_image_path
                ? route('certificate-templates.background', $template->id)
                : null,
        ]);
    }

    private function generateCertificateNumber(string $organizationId, string $courseId): string
    {
        $prefix = 'CERT';
        $year = date('Y');
        $count = CourseStudent::where('organization_id', $organizationId)
            ->where('course_id', $courseId)
            ->whereNotNull('certificate_number')
            ->count() + 1;

        return sprintf('%s-%s-%04d', $prefix, $year, $count);
    }

    public function getCertificateData(Request $request, string $courseStudentId)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $student = CourseStudent::where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->with(['course', 'certificateTemplate'])
            ->find($courseStudentId);

        if (!$student) {
            return response()->json(['error' => 'Course student not found'], 404);
        }

        $template = $student->certificateTemplate;
        if (!$template) {
            // Get default template
            $template = CertificateTemplate::where('organization_id', $profile->organization_id)
                ->where('is_default', true)
                ->where('is_active', true)
                ->whereNull('deleted_at')
                ->first();
        }

        return response()->json([
            'student' => [
                'id' => $student->id,
                'full_name' => $student->full_name,
                'father_name' => $student->father_name,
                'registration_date' => $student->registration_date,
                'completion_date' => $student->completion_date,
                'certificate_number' => $student->certificate_number,
                'certificate_issued_at' => $student->certificate_issued_at,
                'status' => $student->status,
            ],
            'course' => $student->course ? [
                'id' => $student->course->id,
                'name' => $student->course->name,
                'start_date' => $student->course->start_date,
                'end_date' => $student->course->end_date,
                'duration_days' => $student->course->duration_days,
                'instructor_name' => $student->course->instructor_name,
            ] : null,
            'template' => $template,
            'background_url' => $template && $template->background_image_path
                ? route('certificate-templates.background', $template->id)
                : null,
        ]);
    }
}
