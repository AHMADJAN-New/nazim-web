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

        $media = WebsiteMedia::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->orderBy('created_at', 'desc')
            ->get();

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
            'type' => 'required|string|max:30',
            'file_path' => 'required|string',
            'file_name' => 'nullable|string|max:255',
            'alt_text' => 'nullable|string|max:255',
            'metadata' => 'array|nullable',
        ]);

        $media = WebsiteMedia::create(array_merge($data, [
            'organization_id' => $profile->organization_id,
            'school_id' => $schoolId,
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
            'type' => 'sometimes|required|string|max:30',
            'file_path' => 'sometimes|required|string',
            'file_name' => 'nullable|string|max:255',
            'alt_text' => 'nullable|string|max:255',
            'metadata' => 'array|nullable',
        ]);

        $media->fill($data);
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
     * Upload website image for TipTap editor
     * Returns public URL for immediate use in editor
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
            'file' => 'required|image|max:10240', // 10MB max
        ]);

        $file = $request->file('file');

        // Store image using FileStorageService
        $filePath = $this->fileStorageService->storeWebsiteImage(
            $file,
            $profile->organization_id,
            $schoolId
        );

        // Get public URL
        $publicUrl = $this->fileStorageService->getPublicUrl($filePath);

        // Optionally create WebsiteMedia record
        $media = WebsiteMedia::create([
            'organization_id' => $profile->organization_id,
            'school_id' => $schoolId,
            'type' => 'image',
            'file_path' => $filePath,
            'file_name' => $file->getClientOriginalName(),
            'alt_text' => null,
            'metadata' => [
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize(),
            ],
        ]);

        $this->clearPublicCaches($profile->organization_id, $schoolId);

        return response()->json([
            'url' => $publicUrl,
            'path' => $filePath,
            'media_id' => $media->id,
        ], 201);
    }

    private function clearPublicCaches(string $organizationId, string $schoolId): void
    {
        foreach (self::PUBLIC_LANGUAGES as $lang) {
            Cache::forget("public-site:{$organizationId}:{$schoolId}:{$lang}");
        }
    }
}
