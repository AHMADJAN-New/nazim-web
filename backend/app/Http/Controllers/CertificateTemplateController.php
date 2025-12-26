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

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $query = CertificateTemplate::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at');

        // Filter by type (e.g., 'graduation', 'course')
        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }

        // Client-provided school_id is ignored; current school is enforced.

        // Filter by course_id (for short-term course certificates)
        if ($request->filled('course_id')) {
            $query->where('course_id', $request->input('course_id'));
        }

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

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'background_image' => 'nullable|image|mimes:jpeg,jpg,png,gif,webp|max:5120', // 5MB max
            'layout_config' => 'nullable|json',
            'type' => 'nullable|string|in:graduation,course',
            'course_id' => 'nullable|uuid|exists:short_term_courses,id',
            'is_default' => 'nullable|in:0,1,true,false',
            'is_active' => 'nullable|in:0,1,true,false',
        ]);

        // Type defaults to 'graduation' for backward compatibility
        $type = $validated['type'] ?? 'graduation';
        
        // Note: school_id is optional - templates can be general (no school assignment) or assigned to specific schools

        // Validate course_id is not set when type is 'graduation'
        if ($type === 'graduation' && !empty($validated['course_id'])) {
            return response()->json([
                'error' => 'The course_id field cannot be set when type is graduation.',
                'errors' => ['course_id' => ['Graduation certificates cannot be assigned to courses.']]
            ], 422);
        }

        // Strict school scoping: all certificate templates are school-scoped (including course templates)
        if (!empty($validated['course_id'])) {
            $courseOk = DB::table('short_term_courses')
                ->where('id', $validated['course_id'])
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->exists();
            if (!$courseOk) {
                return response()->json(['error' => 'Course not found for this school'], 422);
            }
        }

        // Convert string booleans to actual booleans
        if (isset($validated['is_default'])) {
            $validated['is_default'] = filter_var($validated['is_default'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false;
        }
        if (isset($validated['is_active'])) {
            $validated['is_active'] = filter_var($validated['is_active'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true;
        }

        // Decode layout_config JSON string to array if provided
        $layoutConfig = null;
        if ($request->filled('layout_config')) {
            $layoutConfig = json_decode($request->input('layout_config'), true);
            if (json_last_error() !== JSON_ERROR_NONE || !is_array($layoutConfig)) {
                return response()->json(['error' => 'The layout config field must be a valid JSON array.'], 422);
            }
        }

        $backgroundPath = null;
        if ($request->hasFile('background_image')) {
            try {
                $file = $request->file('background_image');
                
                // Validate file extension
                $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
                $extension = strtolower($file->getClientOriginalExtension());
                if (!in_array($extension, $allowedExtensions)) {
                    return response()->json([
                        'error' => 'The background image must be a valid image file (jpg, jpeg, png, gif, or webp).',
                        'errors' => ['background_image' => ['Invalid file type. Allowed types: ' . implode(', ', $allowedExtensions)]]
                    ], 422);
                }

                // Validate file size (5MB = 5120 KB)
                if ($file->getSize() > 5 * 1024 * 1024) {
                    return response()->json([
                        'error' => 'The background image must not be larger than 5MB.',
                        'errors' => ['background_image' => ['File size exceeds 5MB limit']]
                    ], 422);
                }

                // Ensure storage directory exists
                $directory = 'certificate-templates/' . $profile->organization_id;
                if (!Storage::disk('local')->exists($directory)) {
                    Storage::disk('local')->makeDirectory($directory);
                }

                $fileName = Str::uuid() . '.' . $extension;
                $backgroundPath = $file->storeAs(
                    $directory,
                    $fileName,
                    'local'
                );

                if (!$backgroundPath) {
                    return response()->json([
                        'error' => 'The background image failed to upload. Please try again.',
                        'errors' => ['background_image' => ['File storage failed']]
                    ], 422);
                }
            } catch (\Exception $e) {
                Log::error('Certificate template background image upload failed', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                return response()->json([
                    'error' => 'The background image failed to upload: ' . $e->getMessage(),
                    'errors' => ['background_image' => [$e->getMessage()]]
                ], 422);
            }
        }

        // If this is marked as default, unset other defaults
        if (!empty($validated['is_default'])) {
            CertificateTemplate::where('organization_id', $profile->organization_id)
                ->where('is_default', true)
                ->update(['is_default' => false]);
        }

        $template = CertificateTemplate::create([
            'organization_id' => $profile->organization_id,
            'type' => $type,
            'school_id' => $currentSchoolId,
            'course_id' => $validated['course_id'] ?? null,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'background_image_path' => $backgroundPath,
            'layout_config' => $layoutConfig ?? CertificateTemplate::getDefaultLayout(),
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
            ->where('school_id', $this->getCurrentSchoolId($request))
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

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $template = CertificateTemplate::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'background_image' => 'nullable|image|mimes:jpeg,jpg,png,gif,webp|max:5120',
            'layout_config' => 'nullable|json',
            'type' => 'nullable|string|in:graduation,course',
            'course_id' => 'nullable|uuid|exists:short_term_courses,id',
            'is_default' => 'nullable|in:0,1,true,false',
            'is_active' => 'nullable|in:0,1,true,false',
        ]);

        // Get current type or use provided type
        $type = $validated['type'] ?? $template->type ?? 'graduation';
        
        // Note: school_id is optional - templates can be general (no school assignment) or assigned to specific schools

        // Validate course_id is not set when type is 'graduation'
        if ($type === 'graduation' && !empty($validated['course_id'])) {
            return response()->json([
                'error' => 'The course_id field cannot be set when type is graduation.',
                'errors' => ['course_id' => ['Graduation certificates cannot be assigned to courses.']]
            ], 422);
        }

        // Strict school scoping
        if (array_key_exists('course_id', $validated) && !empty($validated['course_id'])) {
            $courseOk = DB::table('short_term_courses')
                ->where('id', $validated['course_id'])
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->exists();
            if (!$courseOk) {
                return response()->json(['error' => 'Course not found for this school'], 422);
            }
        }

        // Convert string booleans to actual booleans
        if (isset($validated['is_default'])) {
            $validated['is_default'] = filter_var($validated['is_default'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false;
        }
        if (isset($validated['is_active'])) {
            $validated['is_active'] = filter_var($validated['is_active'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true;
        }

        // Decode layout_config JSON string to array if provided
        if ($request->filled('layout_config')) {
            $layoutConfig = json_decode($request->input('layout_config'), true);
            if (json_last_error() !== JSON_ERROR_NONE || !is_array($layoutConfig)) {
                return response()->json(['error' => 'The layout config field must be a valid JSON array.'], 422);
            }
            $validated['layout_config'] = $layoutConfig;
        }

        if ($request->hasFile('background_image')) {
            try {
                // Delete old background if exists
                if ($template->background_image_path && Storage::disk('local')->exists($template->background_image_path)) {
                    Storage::disk('local')->delete($template->background_image_path);
                }

                $file = $request->file('background_image');
                
                // Validate file extension
                $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
                $extension = strtolower($file->getClientOriginalExtension());
                if (!in_array($extension, $allowedExtensions)) {
                    return response()->json([
                        'error' => 'The background image must be a valid image file (jpg, jpeg, png, gif, or webp).',
                        'errors' => ['background_image' => ['Invalid file type. Allowed types: ' . implode(', ', $allowedExtensions)]]
                    ], 422);
                }

                // Validate file size (5MB = 5120 KB)
                if ($file->getSize() > 5 * 1024 * 1024) {
                    return response()->json([
                        'error' => 'The background image must not be larger than 5MB.',
                        'errors' => ['background_image' => ['File size exceeds 5MB limit']]
                    ], 422);
                }

                // Ensure storage directory exists
                $directory = 'certificate-templates/' . $profile->organization_id;
                if (!Storage::disk('local')->exists($directory)) {
                    Storage::disk('local')->makeDirectory($directory);
                }

                $fileName = Str::uuid() . '.' . $extension;
                $validated['background_image_path'] = $file->storeAs(
                    $directory,
                    $fileName,
                    'local'
                );

                if (!$validated['background_image_path']) {
                    return response()->json([
                        'error' => 'The background image failed to upload. Please try again.',
                        'errors' => ['background_image' => ['File storage failed']]
                    ], 422);
                }
            } catch (\Exception $e) {
                Log::error('Certificate template background image upload failed', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                return response()->json([
                    'error' => 'The background image failed to upload: ' . $e->getMessage(),
                    'errors' => ['background_image' => [$e->getMessage()]]
                ], 422);
            }
        }
        unset($validated['background_image']);

        unset($validated['school_id'], $validated['organization_id']);
        // If this is marked as default, unset other defaults
        if (!empty($validated['is_default']) && !$template->is_default) {
            CertificateTemplate::where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->where('id', '!=', $id)
                ->where('is_default', true)
                ->update(['is_default' => false]);
        }

        // Update type if provided
        if (isset($validated['type'])) {
            $validated['type'] = $type;
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
            ->where('school_id', $this->getCurrentSchoolId($request))
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
            ->where('school_id', $this->getCurrentSchoolId($request))
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

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $template = CertificateTemplate::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        // Unset other defaults
        CertificateTemplate::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
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

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $student = CourseStudent::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
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
            ->where('school_id', $currentSchoolId)
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
        $student->certificate_issued_date = now();
        $student->certificate_issued = true;
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

        try {
            if (!$user->hasPermissionTo('certificate_templates.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $student = CourseStudent::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
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
                ->where('school_id', $currentSchoolId)
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
                'grandfather_name' => $student->grandfather_name,
                'mother_name' => $student->mother_name,
                'registration_date' => $student->registration_date,
                'completion_date' => $student->completion_date,
                'certificate_number' => $student->certificate_number,
                'certificate_issued_at' => $student->certificate_issued_date,
                'status' => $student->completion_status,
                'curr_province' => $student->curr_province,
                'curr_district' => $student->curr_district,
                'curr_village' => $student->curr_village,
                'nationality' => $student->nationality,
                'guardian_name' => $student->guardian_name,
                'picture_path' => $student->picture_path,
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

    public function activate(Request $request, string $id)
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

        $template->update(['is_active' => true]);

        return response()->json($template->fresh());
    }

    public function deactivate(Request $request, string $id)
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

        $template->update(['is_active' => false]);

        return response()->json($template->fresh());
    }
}
