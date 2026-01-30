<?php

namespace App\Http\Controllers\Website;

use App\Http\Controllers\Controller;
use App\Models\WebsitePublicBook;
use App\Services\Storage\FileStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class WebsitePublicBooksController extends Controller
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

        $books = WebsitePublicBook::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->orderBy('sort_order')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($books);
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
            'title' => 'required|string|max:255',
            'author' => 'nullable|string|max:255',
            'category' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'cover_image_path' => 'nullable|string',
            'file_path' => 'nullable|string',
            'file_size' => 'nullable|integer',
            'is_featured' => 'boolean',
            'sort_order' => 'integer',
            'status' => 'in:draft,published',
        ]);

        $book = WebsitePublicBook::create(array_merge($data, [
            'organization_id' => $profile->organization_id,
            'school_id' => $schoolId,
            'created_by' => $user->id,
        ]));

        $this->clearPublicCaches($profile->organization_id, $schoolId);

        return response()->json($book, 201);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $book = WebsitePublicBook::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        $data = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'author' => 'nullable|string|max:255',
            'category' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'cover_image_path' => 'nullable|string',
            'file_path' => 'nullable|string',
            'file_size' => 'nullable|integer',
            'is_featured' => 'boolean',
            'sort_order' => 'integer',
            'status' => 'in:draft,published',
        ]);

        $book->fill(array_merge($data, ['updated_by' => $user->id]));
        $book->save();

        $this->clearPublicCaches($profile->organization_id, $schoolId);

        return response()->json($book);
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $book = WebsitePublicBook::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        $book->delete();

        $this->clearPublicCaches($profile->organization_id, $schoolId);

        return response()->json(['status' => 'deleted']);
    }

    /**
     * Upload a document file (e.g. PDF) for a library book.
     * Returns path and file_size for storing on the book record.
     */
    public function uploadFile(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $request->validate([
            'file' => 'required|file|mimetypes:application/pdf|max:51200', // 50MB
        ], [
            'file.required' => 'Please select a PDF file to upload.',
            'file.mimetypes' => 'The file must be a PDF.',
        ]);

        $file = $request->file('file');
        $path = $this->fileStorageService->storeWebsiteLibraryPdf(
            $file,
            $profile->organization_id,
            $schoolId
        );

        return response()->json([
            'path' => $path,
            'file_size' => $file->getSize(),
        ], 201);
    }

    /**
     * Upload a cover image for a library book.
     * Returns path for storing on the book record (cover_image_path).
     */
    public function uploadCover(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $request->validate([
            'file' => 'required|file|mimetypes:image/jpeg,image/png,image/gif,image/webp,image/bmp,image/svg+xml|max:10240',
        ], [
            'file.required' => 'Please select an image.',
            'file.mimetypes' => 'The file must be an image (JPEG, PNG, GIF, WebP, BMP, or SVG).',
        ]);

        $file = $request->file('file');
        $path = $this->fileStorageService->storeWebsiteLibraryCover(
            $file,
            $profile->organization_id,
            $schoolId
        );

        return response()->json(['path' => $path], 201);
    }

    private function clearPublicCaches(string $organizationId, string $schoolId): void
    {
        foreach (self::PUBLIC_LANGUAGES as $lang) {
            Cache::forget("public-site:{$organizationId}:{$schoolId}:{$lang}");
        }
        Cache::forget("public-books:{$organizationId}:{$schoolId}");
    }
}
