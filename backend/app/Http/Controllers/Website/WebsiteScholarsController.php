<?php

namespace App\Http\Controllers\Website;

use App\Http\Controllers\Controller;
use App\Models\WebsiteScholar;
use App\Services\Storage\FileStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class WebsiteScholarsController extends Controller
{
    public function __construct(
        private FileStorageService $fileStorageService
    ) {}

    private const PUBLIC_LANGUAGES = ['en', 'ps', 'fa', 'ar'];

    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $scholars = WebsiteScholar::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return response()->json($scholars);
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
            'title' => 'nullable|string|max:100',
            'bio' => 'nullable|string',
            'photo_path' => 'nullable|string',
            'specializations' => 'nullable|array',
            'contact_email' => 'nullable|email|max:255',
            'is_featured' => 'boolean',
            'sort_order' => 'integer',
            'status' => 'in:draft,published',
        ]);

        $scholar = WebsiteScholar::create(array_merge($data, [
            'organization_id' => $profile->organization_id,
            'school_id' => $schoolId,
            'created_by' => $user->id,
        ]));

        $this->clearPublicCaches($profile->organization_id, $schoolId);

        return response()->json($scholar, 201);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $scholar = WebsiteScholar::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:200',
            'title' => 'nullable|string|max:100',
            'bio' => 'nullable|string',
            'photo_path' => 'nullable|string',
            'specializations' => 'nullable|array',
            'contact_email' => 'nullable|email|max:255',
            'is_featured' => 'boolean',
            'sort_order' => 'integer',
            'status' => 'in:draft,published',
        ]);

        $scholar->fill(array_merge($data, ['updated_by' => $user->id]));
        $scholar->save();

        $this->clearPublicCaches($profile->organization_id, $schoolId);

        return response()->json($scholar);
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $scholar = WebsiteScholar::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        $scholar->delete();

        $this->clearPublicCaches($profile->organization_id, $schoolId);

        return response()->json(['status' => 'deleted']);
    }

    /**
     * Upload scholar photo. Stores file via FileStorageService and updates scholar.photo_path.
     */
    public function uploadPhoto(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $scholar = WebsiteScholar::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        $request->validate([
            'file' => 'required|file|image|max:5120', // 5MB, image
        ]);

        $file = $request->file('file');

        // Delete previous photo if any
        if ($scholar->photo_path) {
            $this->fileStorageService->deleteFile($scholar->photo_path, $this->fileStorageService->getPublicDisk());
        }

        $filePath = $this->fileStorageService->storeWebsiteScholarPhoto(
            $file,
            $profile->organization_id,
            $schoolId,
            $scholar->id
        );

        $scholar->photo_path = $filePath;
        $scholar->updated_by = $user->id;
        $scholar->save();

        $this->clearPublicCaches($profile->organization_id, $schoolId);

        // Return updated scholar so frontend can update cache; ensure fresh from DB
        $scholar->refresh();

        return response()->json([
            'photo_path' => $scholar->photo_path,
            'photo_url' => $scholar->photo_path ? '/storage/' . ltrim($scholar->photo_path, '/') : null,
            'scholar' => $scholar,
        ]);
    }

    /**
     * Serve scholar photo for admin (auth required).
     */
    public function getPhoto(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();
        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        $schoolId = $this->getCurrentSchoolId($request);

        $scholar = WebsiteScholar::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->firstOrFail();

        if (!$scholar->photo_path) {
            abort(404);
        }

        $disk = $this->fileStorageService->getPublicDisk();
        if (!$this->fileStorageService->fileExists($scholar->photo_path, $disk)) {
            abort(404);
        }

        $file = $this->fileStorageService->getFile($scholar->photo_path, $disk);
        if (!$file || empty($file)) {
            abort(404);
        }

        $mimeType = $this->fileStorageService->getMimeTypeFromExtension($scholar->photo_path);
        return response($file, 200)
            ->header('Content-Type', $mimeType)
            ->header('Content-Disposition', 'inline; filename="scholar-' . $id . '"')
            ->header('Cache-Control', 'private, max-age=3600');
    }

    private function clearPublicCaches(string $organizationId, string $schoolId): void
    {
        foreach (self::PUBLIC_LANGUAGES as $lang) {
            Cache::forget("public-site:{$organizationId}:{$schoolId}:{$lang}");
        }
        Cache::forget("public-scholars:{$organizationId}:{$schoolId}");
    }
}
