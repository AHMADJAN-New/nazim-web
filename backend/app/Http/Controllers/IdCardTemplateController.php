<?php

namespace App\Http\Controllers;

use App\Models\IdCardTemplate;
use App\Services\Storage\FileStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class IdCardTemplateController extends Controller
{
    public function __construct(
        private FileStorageService $fileStorageService
    ) {}
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

        // Ensure organization context is set for Spatie permissions
        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        try {
            if (!$user->hasPermissionTo('id_cards.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[IdCardTemplateController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $query = IdCardTemplate::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
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

        // Ensure organization context is set for Spatie permissions
        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        try {
            if (!$user->hasPermissionTo('id_cards.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'background_image_front' => 'nullable|image|mimes:jpeg,jpg,png,gif,webp|max:5120',
            'background_image_back' => 'nullable|image|mimes:jpeg,jpg,png,gif,webp|max:5120',
            'layout_config_front' => 'nullable|json',
            'layout_config_back' => 'nullable|json',
            'card_size' => 'nullable|string|in:CR80',
            'is_default' => 'nullable|in:0,1,true,false',
            'is_active' => 'nullable|in:0,1,true,false',
        ]);

        // Convert string booleans to actual booleans
        if (isset($validated['is_default'])) {
            $validated['is_default'] = filter_var($validated['is_default'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false;
        }
        if (isset($validated['is_active'])) {
            $validated['is_active'] = filter_var($validated['is_active'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true;
        }

        // Decode layout_config JSON strings to arrays if provided
        $layoutConfigFront = null;
        if ($request->filled('layout_config_front')) {
            $layoutConfigFront = json_decode($request->input('layout_config_front'), true);
            if (json_last_error() !== JSON_ERROR_NONE || !is_array($layoutConfigFront)) {
                return response()->json(['error' => 'The layout config front field must be a valid JSON array.'], 422);
            }
        }

        $layoutConfigBack = null;
        if ($request->filled('layout_config_back')) {
            $layoutConfigBack = json_decode($request->input('layout_config_back'), true);
            if (json_last_error() !== JSON_ERROR_NONE || !is_array($layoutConfigBack)) {
                return response()->json(['error' => 'The layout config back field must be a valid JSON array.'], 422);
            }
        }

        // Generate template ID first so we can use it in file paths
        $templateId = (string) Str::uuid();

        $backgroundPathFront = null;
        if ($request->hasFile('background_image_front')) {
            try {
                $file = $request->file('background_image_front');

                // Validate image extension using FileStorageService
                if (!$this->fileStorageService->isAllowedExtension($file->getClientOriginalName(), $this->fileStorageService->getAllowedImageExtensions())) {
                    return response()->json([
                        'error' => 'The background image front must be a valid image file (jpg, jpeg, png, gif, or webp).',
                        'errors' => ['background_image_front' => ['Invalid file type.']]
                    ], 422);
                }

                if ($file->getSize() > 5 * 1024 * 1024) {
                    return response()->json([
                        'error' => 'The background image front must not be larger than 5MB.',
                        'errors' => ['background_image_front' => ['File size exceeds 5MB limit']]
                    ], 422);
                }

                // Store using FileStorageService (PRIVATE storage for ID card templates)
                $backgroundPathFront = $this->fileStorageService->storeIdCardTemplateBackground(
                    $file,
                    $profile->organization_id,
                    $currentSchoolId,
                    $templateId,
                    'front'
                );
            } catch (\Exception $e) {
                Log::error('ID card template background image front upload failed', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                return response()->json([
                    'error' => 'The background image front failed to upload: ' . $e->getMessage(),
                    'errors' => ['background_image_front' => [$e->getMessage()]]
                ], 422);
            }
        }

        $backgroundPathBack = null;
        if ($request->hasFile('background_image_back')) {
            try {
                $file = $request->file('background_image_back');

                // Validate image extension using FileStorageService
                if (!$this->fileStorageService->isAllowedExtension($file->getClientOriginalName(), $this->fileStorageService->getAllowedImageExtensions())) {
                    return response()->json([
                        'error' => 'The background image back must be a valid image file (jpg, jpeg, png, gif, or webp).',
                        'errors' => ['background_image_back' => ['Invalid file type.']]
                    ], 422);
                }

                if ($file->getSize() > 5 * 1024 * 1024) {
                    return response()->json([
                        'error' => 'The background image back must not be larger than 5MB.',
                        'errors' => ['background_image_back' => ['File size exceeds 5MB limit']]
                    ], 422);
                }

                // Store using FileStorageService (PRIVATE storage for ID card templates)
                $backgroundPathBack = $this->fileStorageService->storeIdCardTemplateBackground(
                    $file,
                    $profile->organization_id,
                    $currentSchoolId,
                    $templateId,
                    'back'
                );
            } catch (\Exception $e) {
                Log::error('ID card template background image back upload failed', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                return response()->json([
                    'error' => 'The background image back failed to upload: ' . $e->getMessage(),
                    'errors' => ['background_image_back' => [$e->getMessage()]]
                ], 422);
            }
        }

        // If this is marked as default, unset other defaults
        if (!empty($validated['is_default'])) {
            IdCardTemplate::where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->where('is_default', true)
                ->update(['is_default' => false]);
        }

        $template = IdCardTemplate::create([
            'id' => $templateId,
            'organization_id' => $profile->organization_id,
            'school_id' => $currentSchoolId,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'background_image_path_front' => $backgroundPathFront,
            'background_image_path_back' => $backgroundPathBack,
            'layout_config_front' => $layoutConfigFront ?? IdCardTemplate::getDefaultLayoutFront(),
            'layout_config_back' => $layoutConfigBack ?? IdCardTemplate::getDefaultLayoutBack(),
            'card_size' => $validated['card_size'] ?? 'CR80',
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

        // Ensure organization context is set for Spatie permissions
        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        try {
            if (!$user->hasPermissionTo('id_cards.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[IdCardTemplateController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $template = IdCardTemplate::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
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

        // Ensure organization context is set for Spatie permissions
        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        try {
            if (!$user->hasPermissionTo('id_cards.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $template = IdCardTemplate::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'background_image_front' => 'nullable|image|mimes:jpeg,jpg,png,gif,webp|max:5120',
            'background_image_back' => 'nullable|image|mimes:jpeg,jpg,png,gif,webp|max:5120',
            'layout_config_front' => 'nullable|json',
            'layout_config_back' => 'nullable|json',
            'card_size' => 'nullable|string|in:CR80',
            'is_default' => 'nullable|in:0,1,true,false',
            'is_active' => 'nullable|in:0,1,true,false',
        ]);

        // Convert string booleans to actual booleans
        if (isset($validated['is_default'])) {
            $validated['is_default'] = filter_var($validated['is_default'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false;
        }
        if (isset($validated['is_active'])) {
            $validated['is_active'] = filter_var($validated['is_active'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true;
        }

        // Decode layout_config JSON strings to arrays if provided
        if ($request->filled('layout_config_front')) {
            $layoutConfigFront = json_decode($request->input('layout_config_front'), true);
            if (json_last_error() !== JSON_ERROR_NONE || !is_array($layoutConfigFront)) {
                return response()->json(['error' => 'The layout config front field must be a valid JSON array.'], 422);
            }
            $validated['layout_config_front'] = $layoutConfigFront;
        }

        if ($request->filled('layout_config_back')) {
            $layoutConfigBack = json_decode($request->input('layout_config_back'), true);
            if (json_last_error() !== JSON_ERROR_NONE || !is_array($layoutConfigBack)) {
                return response()->json(['error' => 'The layout config back field must be a valid JSON array.'], 422);
            }
            $validated['layout_config_back'] = $layoutConfigBack;
        }

        // Handle background image front upload
        if ($request->hasFile('background_image_front')) {
            try {
                // Delete old background if exists using FileStorageService
                if ($template->background_image_path_front) {
                    $this->fileStorageService->deleteFile($template->background_image_path_front);
                }

                $file = $request->file('background_image_front');

                // Validate image extension using FileStorageService
                if (!$this->fileStorageService->isAllowedExtension($file->getClientOriginalName(), $this->fileStorageService->getAllowedImageExtensions())) {
                    return response()->json([
                        'error' => 'The background image front must be a valid image file (jpg, jpeg, png, gif, or webp).',
                        'errors' => ['background_image_front' => ['Invalid file type.']]
                    ], 422);
                }

                if ($file->getSize() > 5 * 1024 * 1024) {
                    return response()->json([
                        'error' => 'The background image front must not be larger than 5MB.',
                        'errors' => ['background_image_front' => ['File size exceeds 5MB limit']]
                    ], 422);
                }

                // Store using FileStorageService (PRIVATE storage for ID card templates)
                $validated['background_image_path_front'] = $this->fileStorageService->storeIdCardTemplateBackground(
                    $file,
                    $profile->organization_id,
                    $template->school_id,
                    $template->id,
                    'front'
                );
            } catch (\Exception $e) {
                Log::error('ID card template background image front upload failed', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                return response()->json([
                    'error' => 'The background image front failed to upload: ' . $e->getMessage(),
                    'errors' => ['background_image_front' => [$e->getMessage()]]
                ], 422);
            }
        }
        unset($validated['background_image_front']);

        // Handle background image back upload
        if ($request->hasFile('background_image_back')) {
            try {
                // Delete old background if exists using FileStorageService
                if ($template->background_image_path_back) {
                    $this->fileStorageService->deleteFile($template->background_image_path_back);
                }

                $file = $request->file('background_image_back');

                // Validate image extension using FileStorageService
                if (!$this->fileStorageService->isAllowedExtension($file->getClientOriginalName(), $this->fileStorageService->getAllowedImageExtensions())) {
                    return response()->json([
                        'error' => 'The background image back must be a valid image file (jpg, jpeg, png, gif, or webp).',
                        'errors' => ['background_image_back' => ['Invalid file type.']]
                    ], 422);
                }

                if ($file->getSize() > 5 * 1024 * 1024) {
                    return response()->json([
                        'error' => 'The background image back must not be larger than 5MB.',
                        'errors' => ['background_image_back' => ['File size exceeds 5MB limit']]
                    ], 422);
                }

                // Store using FileStorageService (PRIVATE storage for ID card templates)
                $validated['background_image_path_back'] = $this->fileStorageService->storeIdCardTemplateBackground(
                    $file,
                    $profile->organization_id,
                    $template->school_id,
                    $template->id,
                    'back'
                );
            } catch (\Exception $e) {
                Log::error('ID card template background image back upload failed', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                return response()->json([
                    'error' => 'The background image back failed to upload: ' . $e->getMessage(),
                    'errors' => ['background_image_back' => [$e->getMessage()]]
                ], 422);
            }
        }
        unset($validated['background_image_back']);

        // If this is marked as default, unset other defaults
        if (!empty($validated['is_default']) && !$template->is_default) {
            IdCardTemplate::where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->where('id', '!=', $id)
                ->where('is_default', true)
                ->update(['is_default' => false]);
        }

        $template->update($validated);
        $template->updated_by = (string) $user->id;
        $template->save();

        return response()->json($template->fresh());
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Ensure organization context is set for Spatie permissions
        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        try {
            if (!$user->hasPermissionTo('id_cards.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $template = IdCardTemplate::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        // Delete background images if exist using FileStorageService
        if ($template->background_image_path_front) {
            $this->fileStorageService->deleteFile($template->background_image_path_front);
        }
        if ($template->background_image_path_back) {
            $this->fileStorageService->deleteFile($template->background_image_path_back);
        }

        $template->delete();

        return response()->noContent();
    }

    public function getBackgroundImage(Request $request, string $id, string $side)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Ensure organization context is set for Spatie permissions
        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        try {
            if (!$user->hasPermissionTo('id_cards.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[IdCardTemplateController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        if (!in_array($side, ['front', 'back'])) {
            return response()->json(['error' => 'Invalid side. Must be "front" or "back".'], 422);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $template = IdCardTemplate::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        $backgroundPath = $side === 'front'
            ? $template->background_image_path_front
            : $template->background_image_path_back;

        if (!$backgroundPath) {
            return response()->json(['error' => 'Background image not found'], 404);
        }

        // Check if file exists using FileStorageService
        if (!$this->fileStorageService->fileExists($backgroundPath)) {
            return response()->json(['error' => 'File not found on storage'], 404);
        }

        // Get file and return response using FileStorageService
        return $this->fileStorageService->getFileResponse($backgroundPath);
    }

    public function setDefault(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Ensure organization context is set for Spatie permissions
        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        try {
            if (!$user->hasPermissionTo('id_cards.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $template = IdCardTemplate::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        // Unset other defaults
        IdCardTemplate::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', '!=', $id)
            ->where('is_default', true)
            ->update(['is_default' => false]);

        $template->update(['is_default' => true]);

        return response()->json($template->fresh());
    }
}
