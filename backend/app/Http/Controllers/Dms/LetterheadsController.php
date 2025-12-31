<?php

namespace App\Http\Controllers\Dms;

use App\Models\Letterhead;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class LetterheadsController extends BaseDmsController
{
    public function index(Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.letterheads.manage');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        $this->authorize('viewAny', Letterhead::class);
        [, $profile, $currentSchoolId] = $context;

        $query = Letterhead::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId);

        if ($request->filled('letter_type')) {
            $query->where('letter_type', $request->letter_type);
        }
        if ($request->filled('file_type')) {
            $query->where('file_type', $request->file_type);
        }
        if ($request->filled('active')) {
            $query->where('active', $request->boolean('active'));
        }
        if ($request->filled('search')) {
            $query->where('name', 'ilike', '%' . $request->search . '%');
        }

        if ($request->boolean('paginate', false)) {
            $perPage = min(100, $request->integer('per_page', 20));
            return $query->orderBy('name')->paginate($perPage);
        }

        return $query->orderBy('name')->get();
    }

    public function store(Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.letterheads.manage');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        $this->authorize('create', Letterhead::class);
        [, $profile, $currentSchoolId] = $context;

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,webp'],
            'file_type' => ['nullable', 'string', 'in:pdf,image,html'],
            'letter_type' => ['nullable', 'string', 'max:50'],
            'letterhead_type' => ['nullable', 'string', 'in:background,watermark'],
            'active' => ['boolean'],
        ]);

        $file = $request->file('file');
        // Store with organization_id in path for multi-tenancy
        $path = $file->store("letterheads/{$profile->organization_id}/{$currentSchoolId}");

        // Detect file type if not provided
        $fileType = $data['file_type'] ?? ($file->getMimeType() === 'application/pdf' ? 'pdf' : 'image');
        $imagePath = null;

        if ($fileType === 'pdf') {
            try {
                $imagePath = $this->convertPdfToImagePath($path, $profile->organization_id, $currentSchoolId);
            } catch (\Exception $e) {
                Log::warning('PDF letterhead conversion failed', [
                    'error' => $e->getMessage(),
                    'file_path' => $path,
                ]);
                return response()->json([
                    'error' => 'PDF letterhead conversion failed. Please upload a PNG/JPG letterhead or enable PDF conversion on the server.',
                ], 422);
            }
        } elseif ($fileType === 'image') {
            $imagePath = $path;
        }

        $record = Letterhead::create([
            'organization_id' => $profile->organization_id,
            'school_id' => $currentSchoolId,
            'name' => $data['name'],
            'file_path' => $path,
            'file_type' => $fileType,
            'image_path' => $imagePath,
            'letter_type' => $data['letter_type'] ?? null,
            'letterhead_type' => $data['letterhead_type'] ?? 'background',
            'active' => $data['active'] ?? true,
        ]);

        // Generate preview if image (will be handled by service when created)
        if ($fileType === 'image' && class_exists(\App\Services\LetterheadPreviewService::class)) {
            try {
                $previewService = app(\App\Services\LetterheadPreviewService::class);
                if (method_exists($previewService, 'generatePreview')) {
                    $previewUrl = $previewService->generatePreview($record);
                    if ($previewUrl) {
                        $record->preview_url = $previewUrl;
                        $record->save();
                    }
                }
            } catch (\Exception $e) {
                // Preview generation failed, continue without preview
            }
        } elseif ($imagePath) {
            $record->preview_url = route('dms.letterheads.serve', ['id' => $record->id, 'variant' => 'image']);
            $record->save();
        }

        return response()->json($record, 201);
    }

    public function update(string $id, Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.letterheads.manage');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile, $currentSchoolId] = $context;

        $record = Letterhead::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->firstOrFail();

        $this->authorize('update', $record);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'file_type' => ['nullable', 'string', 'in:pdf,image,html'],
            'letter_type' => ['nullable', 'string', 'max:50'],
            'letterhead_type' => ['nullable', 'string', 'in:background,watermark'],
            'active' => ['boolean'],
            'file' => ['sometimes', 'file', 'mimes:pdf,jpg,jpeg,png,webp'],
        ]);

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            // Store with organization_id in path for multi-tenancy
            $data['file_path'] = $file->store("letterheads/{$profile->organization_id}/{$currentSchoolId}");
            
            // Detect file type if not provided
            if (!isset($data['file_type'])) {
                $data['file_type'] = $file->getMimeType() === 'application/pdf' ? 'pdf' : 'image';
            }

            if ($data['file_type'] === 'pdf') {
                try {
                    $data['image_path'] = $this->convertPdfToImagePath($data['file_path'], $profile->organization_id, $currentSchoolId);
                } catch (\Exception $e) {
                    Log::warning('PDF letterhead conversion failed on update', [
                        'error' => $e->getMessage(),
                        'file_path' => $data['file_path'],
                    ]);
                    return response()->json([
                        'error' => 'PDF letterhead conversion failed. Please upload a PNG/JPG letterhead or enable PDF conversion on the server.',
                    ], 422);
                }
            } elseif ($data['file_type'] === 'image') {
                $data['image_path'] = $data['file_path'];
            }

            // Generate preview if image (will be handled by service when created)
            if ($data['file_type'] === 'image' && class_exists(\App\Services\LetterheadPreviewService::class)) {
                try {
                    $previewService = app(\App\Services\LetterheadPreviewService::class);
                    if (method_exists($previewService, 'generatePreview')) {
                        $record->file_path = $data['file_path'];
                        $record->file_type = $data['file_type'];
                        $previewUrl = $previewService->generatePreview($record);
                        if ($previewUrl) {
                            $data['preview_url'] = $previewUrl;
                        }
                    }
                } catch (\Exception $e) {
                    // Preview generation failed, continue without preview
                }
            } elseif (!empty($data['image_path'])) {
                $data['preview_url'] = route('dms.letterheads.serve', ['id' => $record->id, 'variant' => 'image']);
            }
        }

        $record->fill($data);
        $record->save();

        return $record;
    }

    public function download(string $id, Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.letterheads.manage');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile, $currentSchoolId] = $context;

        $record = Letterhead::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->firstOrFail();

        $this->authorize('view', $record);

        if (!Storage::exists($record->file_path)) {
            return response()->json(['error' => 'File not found'], 404);
        }

        $extension = pathinfo($record->file_path, PATHINFO_EXTENSION) ?: ($record->file_type === 'pdf' ? 'pdf' : 'png');
        return Storage::download($record->file_path, $record->name . '.' . $extension);
    }

    public function show(string $id, Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.letterheads.manage');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile, $currentSchoolId] = $context;

        $record = Letterhead::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->firstOrFail();

        $this->authorize('view', $record);

        return $record;
    }

    public function destroy(string $id, Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.letterheads.manage');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile, $currentSchoolId] = $context;

        $record = Letterhead::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->firstOrFail();

        $this->authorize('delete', $record);

        // Check if letterhead is in use
        $inUse = \App\Models\LetterTemplate::where('letterhead_id', $id)->exists()
            || \App\Models\OutgoingDocument::where('letterhead_id', $id)->exists();

        if ($inUse) {
            return response()->json(['error' => 'This letterhead is in use and cannot be deleted'], 409);
        }

        // Delete file from storage
        if ($record->file_path && Storage::exists($record->file_path)) {
            Storage::delete($record->file_path);
        }

        $record->delete();

        return response()->noContent();
    }

    public function serve(string $id, Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.letterheads.read');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile, $currentSchoolId] = $context;

        $record = Letterhead::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->firstOrFail();

        $this->authorize('view', $record);

        $variant = $request->query('variant');
        $servePath = $record->file_path;
        if ($variant === 'image') {
            $servePath = $record->image_path ?: ($record->file_type === 'image' ? $record->file_path : null);
        }

        if (!$servePath || !Storage::exists($servePath)) {
            abort(404, 'File not found');
        }

        // Determine content type based on file extension
        $extension = pathinfo($servePath, PATHINFO_EXTENSION);
        $contentType = match(strtolower($extension)) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'pdf' => 'application/pdf',
            default => 'application/octet-stream',
        };

        $downloadName = $record->name;
        if ($extension) {
            $downloadName .= '.' . $extension;
        }

        return Storage::response(
            $servePath,
            $downloadName,
            ['Content-Type' => $contentType],
            'inline'
        );
    }

    public function preview(string $id, Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.letterheads.manage');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile, $currentSchoolId] = $context;

        $record = Letterhead::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->firstOrFail();

        $this->authorize('view', $record);

        $imageUrl = $record->image_url;
        $html = '';
        if ($imageUrl) {
            $html = '<img src="' . e($imageUrl) . '" alt="' . e($record->name) . '" style="max-width: 100%; height: auto;" />';
        }

        return response()->json([
            'html' => $html,
            'letterhead' => $record,
            'preview_url' => $record->preview_url,
            'file_url' => $record->file_url ?? route('dms.letterheads.serve', ['id' => $record->id]),
            'image_url' => $imageUrl,
        ]);
    }

    private function convertPdfToImagePath(string $pdfPath, string $organizationId, string $schoolId): string
    {
        $pdfFullPath = Storage::path($pdfPath);
        $imageData = $this->convertPdfToImageData($pdfFullPath);
        if (!$imageData) {
            throw new \RuntimeException('Unable to convert PDF to image.');
        }

        $imagePath = sprintf(
            'letterheads/%s/%s/rendered/%s.png',
            $organizationId,
            $schoolId,
            Str::uuid()->toString()
        );
        Storage::put($imagePath, $imageData);

        return $imagePath;
    }

    private function convertPdfToImageData(string $pdfFullPath): ?string
    {
        if (extension_loaded('imagick')) {
            try {
                $imagick = new \Imagick();
                $imagick->setResolution(300, 300);
                $imagick->readImage($pdfFullPath . '[0]');
                $imagick->setImageFormat('png');
                $imagick->setImageCompressionQuality(95);
                $imagick->setImageAlphaChannel(\Imagick::ALPHACHANNEL_REMOVE);
                $imagick->setImageBackgroundColor(new \ImagickPixel('white'));
                $imagick->setImageCompose(\Imagick::COMPOSITE_OVER);
                $imagick->setImageMatte(false);
                $imageData = $imagick->getImageBlob();
                $imagick->clear();
                $imagick->destroy();

                if ($imageData) {
                    return $imageData;
                }
            } catch (\Exception $e) {
                Log::warning('Imagick PDF conversion failed', [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $gsCheck = @shell_exec('gs --version 2>&1');
        if (!$gsCheck || str_contains($gsCheck, 'not found') || str_contains($gsCheck, 'command not found')) {
            return null;
        }

        $tempPngPath = tempnam(sys_get_temp_dir(), 'dms_letterhead_');
        if (!$tempPngPath) {
            return null;
        }
        $tempPngPath .= '.png';

        $command = sprintf(
            'gs -dNOPAUSE -dBATCH -sDEVICE=png16m -r300 -dFirstPage=1 -dLastPage=1 -sOutputFile=%s %s 2>&1',
            escapeshellarg($tempPngPath),
            escapeshellarg($pdfFullPath)
        );

        $output = [];
        $returnVar = 0;
        @exec($command, $output, $returnVar);

        if ($returnVar !== 0 || !file_exists($tempPngPath)) {
            if (file_exists($tempPngPath)) {
                @unlink($tempPngPath);
            }
            return null;
        }

        $imageData = file_get_contents($tempPngPath);
        @unlink($tempPngPath);

        return $imageData && strlen($imageData) > 0 ? $imageData : null;
    }
}
