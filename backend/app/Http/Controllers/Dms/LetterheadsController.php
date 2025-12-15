<?php

namespace App\Http\Controllers\Dms;

use App\Models\Letterhead;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class LetterheadsController extends BaseDmsController
{
    public function index(Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.letterheads.manage');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        $this->authorize('viewAny', Letterhead::class);
        [, $profile] = $context;

        $query = Letterhead::where('organization_id', $profile->organization_id);

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
        [, $profile] = $context;

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,webp'],
            'file_type' => ['nullable', 'string', 'in:pdf,image,html'],
            'letter_type' => ['nullable', 'string', 'max:50'],
            'default_for_layout' => ['nullable', 'string'],
            'position' => ['nullable', 'string', 'in:header,background,watermark'],
            'active' => ['boolean'],
            'school_id' => ['nullable', 'uuid'],
        ]);

        $file = $request->file('file');
        $path = $file->store('letterheads');
        
        // Detect file type if not provided
        $fileType = $data['file_type'] ?? ($file->getMimeType() === 'application/pdf' ? 'pdf' : 'image');

        $record = Letterhead::create([
            'organization_id' => $profile->organization_id,
            'school_id' => $data['school_id'] ?? null,
            'name' => $data['name'],
            'file_path' => $path,
            'file_type' => $fileType,
            'letter_type' => $data['letter_type'] ?? null,
            'default_for_layout' => $data['default_for_layout'] ?? null,
            'position' => $data['position'] ?? 'header',
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
        }

        return response()->json($record, 201);
    }

    public function update(string $id, Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.letterheads.manage');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile] = $context;

        $record = Letterhead::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->firstOrFail();

        $this->authorize('update', $record);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'file_type' => ['nullable', 'string', 'in:pdf,image,html'],
            'letter_type' => ['nullable', 'string', 'max:50'],
            'default_for_layout' => ['nullable', 'string'],
            'position' => ['nullable', 'string', 'in:header,background,watermark'],
            'active' => ['boolean'],
            'file' => ['sometimes', 'file', 'mimes:pdf,jpg,jpeg,png,webp'],
        ]);

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $data['file_path'] = $file->store('letterheads');
            
            // Detect file type if not provided
            if (!isset($data['file_type'])) {
                $data['file_type'] = $file->getMimeType() === 'application/pdf' ? 'pdf' : 'image';
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
        [, $profile] = $context;

        $record = Letterhead::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->firstOrFail();

        $this->authorize('view', $record);

        return Storage::download($record->file_path, $record->name . '.pdf');
    }

    public function show(string $id, Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.letterheads.manage');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile] = $context;

        $record = Letterhead::where('id', $id)
            ->where('organization_id', $profile->organization_id)
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
        [, $profile] = $context;

        $record = Letterhead::where('id', $id)
            ->where('organization_id', $profile->organization_id)
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
        [, $profile] = $context;

        $record = Letterhead::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->firstOrFail();

        $this->authorize('view', $record);

        if (!$record->file_path || !Storage::exists($record->file_path)) {
            abort(404, 'File not found');
        }

        // Determine content type based on file extension
        $extension = pathinfo($record->file_path, PATHINFO_EXTENSION);
        $contentType = match(strtolower($extension)) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'pdf' => 'application/pdf',
            default => 'application/octet-stream',
        };

        return Storage::response($record->file_path, $record->name, [
            'Content-Type' => $contentType,
        ]);
    }

    public function preview(string $id, Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.letterheads.manage');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [, $profile] = $context;

        $record = Letterhead::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->firstOrFail();

        $this->authorize('view', $record);

        $html = '';
        $renderingService = app(\App\Services\DocumentRenderingService::class);
        if (method_exists($renderingService, 'processLetterheadFile')) {
            $html = $renderingService->processLetterheadFile($record);
        } else {
            // Fallback: return file URL
            $html = '<img src="' . Storage::url($record->file_path) . '" alt="' . e($record->name) . '" />';
        }

        return response()->json([
            'html' => $html,
            'letterhead' => $record,
            'preview_url' => $record->preview_url,
        ]);
    }
}
