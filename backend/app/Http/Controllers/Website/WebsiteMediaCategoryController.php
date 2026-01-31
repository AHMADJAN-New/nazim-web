<?php

namespace App\Http\Controllers\Website;

use App\Http\Controllers\Controller;
use App\Models\WebsiteMediaCategory;
use App\Services\Storage\FileStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class WebsiteMediaCategoryController extends Controller
{
    private const PUBLIC_LANGUAGES = ['en', 'ps', 'fa', 'ar'];

    public function __construct(
        private FileStorageService $fileStorageService
    ) {}

    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $page = (int) $request->query('page', 1);
        $perPage = (int) $request->query('per_page', 25);
        if ($perPage < 1) {
            $perPage = 1;
        }
        if ($perPage > 100) {
            $perPage = 100;
        }

        $categories = WebsiteMediaCategory::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->orderBy('sort_order')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

        return response()->json($categories);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $data = $request->validate([
            'name' => 'required|string|max:200',
            'slug' => 'nullable|string|max:200',
            'description' => 'nullable|string',
            'cover_image_path' => 'nullable|string',
            'sort_order' => 'nullable|integer',
            'is_active' => 'boolean',
        ]);

        $category = WebsiteMediaCategory::create(array_merge($data, [
            'organization_id' => $profile->organization_id,
            'school_id' => $schoolId,
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]));

        $this->clearPublicCaches($profile->organization_id, $schoolId);

        return response()->json($category, 201);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $category = WebsiteMediaCategory::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:200',
            'slug' => 'nullable|string|max:200',
            'description' => 'nullable|string',
            'cover_image_path' => 'nullable|string',
            'sort_order' => 'nullable|integer',
            'is_active' => 'boolean',
        ]);

        $category->fill($data);
        $category->updated_by = $user->id;
        $category->save();

        $this->clearPublicCaches($profile->organization_id, $schoolId);

        return response()->json($category);
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $category = WebsiteMediaCategory::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        $category->delete();

        $this->clearPublicCaches($profile->organization_id, $schoolId);

        return response()->noContent();
    }

    /**
     * Upload cover image for a media category.
     * Stores under website/media/categories/{categoryId}/
     */
    public function uploadCover(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $category = WebsiteMediaCategory::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        $request->validate([
            'file' => 'required|file|mimetypes:image/jpeg,image/png,image/gif,image/webp,image/bmp,image/svg+xml|max:10240',
        ], [
            'file.required' => 'Please select an image.',
            'file.mimetypes' => 'The file must be an image (JPEG, PNG, GIF, WebP, BMP, or SVG).',
        ]);

        $file = $request->file('file');
        $path = $this->fileStorageService->storeWebsiteMediaCategoryCover(
            $file,
            $profile->organization_id,
            $schoolId,
            $category->id
        );

        $category->cover_image_path = $path;
        $category->updated_by = $user->id;
        $category->save();

        $this->clearPublicCaches($profile->organization_id, $schoolId);

        return response()->json(['path' => $path, 'cover_image_path' => $path], 200);
    }

    private function clearPublicCaches(string $organizationId, string $schoolId): void
    {
        foreach (self::PUBLIC_LANGUAGES as $lang) {
            Cache::forget("public-site:{$organizationId}:{$schoolId}:{$lang}");
        }
        Cache::forget("public-media-categories:{$organizationId}:{$schoolId}");
        Cache::forget("public-media:{$organizationId}:{$schoolId}::1");
    }
}
