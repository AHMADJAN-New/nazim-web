<?php

namespace App\Http\Controllers\Website;

use App\Http\Controllers\Controller;
use App\Models\WebsiteMedia;
use App\Services\Storage\FileStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class WebsiteMediaController extends Controller
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

        $media = WebsiteMedia::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

        return response()->json($media);
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
            'category_id' => 'nullable|uuid',
            'type' => 'required|string|max:30',
            'file_path' => 'required|string',
            'file_name' => 'nullable|string|max:255',
            'alt_text' => 'nullable|string|max:255',
            'metadata' => 'array|nullable',
        ]);

        $media = WebsiteMedia::create(array_merge($data, [
            'organization_id' => $profile->organization_id,
            'school_id' => $schoolId,
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]));

        $this->clearPublicCaches($profile->organization_id, $schoolId);

        return response()->json($media, 201);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $media = WebsiteMedia::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        $data = $request->validate([
            'category_id' => 'nullable|uuid',
            'type' => 'sometimes|required|string|max:30',
            'file_path' => 'sometimes|required|string',
            'file_name' => 'nullable|string|max:255',
            'alt_text' => 'nullable|string|max:255',
            'metadata' => 'array|nullable',
        ]);

        $media->fill($data);
        $media->updated_by = $user->id;
        $media->save();

        $this->clearPublicCaches($profile->organization_id, $schoolId);

        return response()->json($media);
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $media = WebsiteMedia::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        $media->delete();

        $this->clearPublicCaches($profile->organization_id, $schoolId);

        return response()->json(['status' => 'deleted']);
    }

    /**
     * Upload website image for TipTap editor, gallery covers, media library.
     * Returns path and relative URL so the frontend can avoid mixed content (HTTPS page loading HTTP image).
     */
    public function uploadImage(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $request->validate([
            'file' => 'required|file|mimetypes:image/jpeg,image/png,image/gif,image/webp,image/bmp,image/svg+xml|max:10240', // 10MB
            'category_id' => 'nullable|uuid',
        ], [
            'file.required' => 'No file was uploaded. Please select an image.',
            'file.mimetypes' => 'The file must be an image (JPEG, PNG, GIF, WebP, BMP, or SVG).',
        ]);

        $file = $request->file('file');
        $categoryId = $request->input('category_id');

        // Store under website/media/categories/{id}/items/ or website/media/items/
        $filePath = $this->fileStorageService->storeWebsiteMediaItem(
            $file,
            $profile->organization_id,
            $schoolId,
            $categoryId,
            null
        );

        // Return relative URL so frontend uses same origin (avoids mixed content when page is HTTPS)
        $relativeUrl = '/storage/' . $filePath;

        $media = WebsiteMedia::create([
            'organization_id' => $profile->organization_id,
            'school_id' => $schoolId,
            'category_id' => $categoryId,
            'type' => 'image',
            'file_path' => $filePath,
            'file_name' => $file->getClientOriginalName(),
            'alt_text' => null,
            'metadata' => [
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize(),
            ],
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $this->clearPublicCaches($profile->organization_id, $schoolId);

        return response()->json([
            'url' => $relativeUrl,
            'path' => $filePath,
            'media_id' => $media->id,
        ], 201);
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
