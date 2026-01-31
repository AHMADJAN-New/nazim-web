<?php

namespace App\Http\Controllers\Website;

use App\Http\Controllers\Controller;
use App\Models\WebsitePage;
use App\Services\Storage\FileStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class WebsitePageController extends Controller
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

        $pages = WebsitePage::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($pages);
    }

    public function show(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $page = WebsitePage::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        return response()->json($page);
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
            'slug' => 'required|string|max:120',
            'title' => 'required|string|max:200',
            'status' => 'required|string|max:20',
            'content_json' => 'array|nullable',
            'seo_title' => 'nullable|string|max:200',
            'seo_description' => 'nullable|string|max:400',
            'seo_image_path' => 'nullable|string',
            'published_at' => 'nullable|date',
        ]);

        $page = WebsitePage::create(array_merge($data, [
            'organization_id' => $profile->organization_id,
            'school_id' => $schoolId,
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]));

        $this->clearPublicCaches($profile->organization_id, $schoolId, $page->slug);

        return response()->json($page, 201);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $page = WebsitePage::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        $data = $request->validate([
            'slug' => 'sometimes|required|string|max:120',
            'title' => 'sometimes|required|string|max:200',
            'status' => 'sometimes|required|string|max:20',
            'content_json' => 'array|nullable',
            'seo_title' => 'nullable|string|max:200',
            'seo_description' => 'nullable|string|max:400',
            'seo_image_path' => 'nullable|string',
            'published_at' => 'nullable|date',
        ]);

        // Store old slug before updating (in case it changes)
        $oldSlug = $page->slug;

        $page->fill($data);
        $page->updated_by = $user->id;
        $page->save();

        // Clear cache for both old and new slug (if slug changed)
        $this->clearPublicCaches($profile->organization_id, $schoolId, $page->slug);
        if ($oldSlug !== $page->slug) {
            $this->clearPublicCaches($profile->organization_id, $schoolId, $oldSlug);
        }

        return response()->json($page);
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $page = WebsitePage::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        $page->delete();

        $this->clearPublicCaches($profile->organization_id, $schoolId, $page->slug);

        return response()->json(['status' => 'deleted']);
    }

    /**
     * Upload SEO/image for a page.
     * Stores under website/pages/{pageId}/
     */
    public function uploadImage(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $page = WebsitePage::where('organization_id', $profile->organization_id)
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
        $path = $this->fileStorageService->storeWebsitePageImage(
            $file,
            $profile->organization_id,
            $schoolId,
            $page->id
        );

        $page->seo_image_path = $path;
        $page->save();

        $this->clearPublicCaches($profile->organization_id, $schoolId, $page->slug);

        return response()->json(['path' => $path, 'seo_image_path' => $path], 200);
    }

    private function clearPublicCaches(string $organizationId, string $schoolId, string $slug): void
    {
        foreach (self::PUBLIC_LANGUAGES as $lang) {
            Cache::forget("public-site:{$organizationId}:{$schoolId}:{$lang}");
        }
        Cache::forget("public-page:{$organizationId}:{$schoolId}:{$slug}");
    }
}
