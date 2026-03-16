<?php

namespace App\Http\Controllers;

use App\Models\PlatformFile;
use App\Services\Storage\FileStorageService;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Validator;

class PlatformFilesController extends Controller
{
    public function __construct(
        private FileStorageService $fileStorageService
    ) {}

    /**
     * List platform files, optionally filtered by organization_id and category.
     */
    public function index(Request $request)
    {
        $query = PlatformFile::query()
            ->with('organization:id,name')
            ->whereNull('deleted_at')
            ->orderByDesc('created_at');

        $organizationId = $request->query('organization_id');
        if ($organizationId !== null && $organizationId !== '') {
            $query->where('organization_id', $organizationId);
        }

        $category = $request->query('category');
        if ($category !== null && $category !== '') {
            $query->where('category', $category);
        }

        $files = $query->get()->map(fn (PlatformFile $f) => $this->serializeFile($f));

        return response()->json(['data' => $files]);
    }

    /**
     * Upload a new platform file.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'organization_id' => 'nullable|uuid|exists:organizations,id',
            'category' => 'required|string|in:'.implode(',', PlatformFile::CATEGORIES),
            'title' => 'required|string|max:255',
            'notes' => 'nullable|string|max:2000',
            'file' => 'required|file|max:25600',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        /** @var UploadedFile $file */
        $file = $request->file('file');
        $validated = $validator->validated();

        $filePath = $this->fileStorageService->storePlatformFile($file, $validated['category']);

        $platformFile = PlatformFile::create([
            'organization_id' => $validated['organization_id'] ?? null,
            'category' => $validated['category'],
            'title' => $validated['title'],
            'notes' => $validated['notes'] ?? null,
            'file_path' => $filePath,
            'file_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'uploaded_by' => $request->user()?->id,
        ]);

        return response()->json(['data' => $this->serializeFile($platformFile)], 201);
    }

    /**
     * Download a platform file by ID.
     */
    public function download(Request $request, string $id)
    {
        $platformFile = PlatformFile::whereNull('deleted_at')->findOrFail($id);

        return $this->fileStorageService->downloadFile(
            $platformFile->file_path,
            $platformFile->file_name
        );
    }

    /**
     * Soft delete a platform file and remove from storage.
     */
    public function destroy(Request $request, string $id)
    {
        $platformFile = PlatformFile::whereNull('deleted_at')->findOrFail($id);

        $path = $platformFile->file_path;
        $platformFile->delete();
        $this->fileStorageService->deleteFile($path);

        return response()->noContent();
    }

    private function serializeFile(PlatformFile $f): array
    {
        return [
            'id' => $f->id,
            'organization_id' => $f->organization_id,
            'organization' => $f->relationLoaded('organization') && $f->organization
                ? ['id' => $f->organization->id, 'name' => $f->organization->name]
                : null,
            'category' => $f->category,
            'title' => $f->title,
            'notes' => $f->notes,
            'file_name' => $f->file_name,
            'mime_type' => $f->mime_type,
            'file_size' => $f->file_size,
            'uploaded_by' => $f->uploaded_by,
            'created_at' => $f->created_at?->toIso8601String(),
            'updated_at' => $f->updated_at?->toIso8601String(),
        ];
    }
}
