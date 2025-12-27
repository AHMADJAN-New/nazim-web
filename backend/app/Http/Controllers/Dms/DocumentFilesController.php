<?php

namespace App\Http\Controllers\Dms;

use App\Models\IncomingDocument;
use App\Models\OutgoingDocument;
use App\Models\DocumentFile;
use App\Services\SecurityGateService;
use App\Services\Storage\FileStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DocumentFilesController extends BaseDmsController
{
    public function __construct(
        private SecurityGateService $securityGateService,
        private FileStorageService $fileStorageService
    ) {
    }

    public function index(Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.files.read');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [$user, $profile, $currentSchoolId] = $context;

        $request->validate([
            'owner_type' => ['required', 'in:incoming,outgoing'],
            'owner_id' => ['required', 'uuid'],
        ]);

        // For file listing, allow if user created the document or has clearance
        $document = $this->resolveOwnerDocument($request->owner_type, $request->owner_id, $profile->organization_id, $currentSchoolId, $user, true);

        $files = DocumentFile::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('owner_type', $request->owner_type)
            ->where('owner_id', $document->id)
            ->orderByDesc('version')
            ->get();

        // Filter files that user can view (use Gate::allows instead of authorize to avoid exceptions)
        $accessibleFiles = $files->filter(function ($file) use ($user) {
            return \Illuminate\Support\Facades\Gate::forUser($user)->allows('view', $file);
        });

        return $accessibleFiles->values();
    }

    public function store(Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.files.create');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [$user, $profile, $currentSchoolId] = $context;

        $data = $request->validate([
            'owner_type' => ['required', 'in:incoming,outgoing'],
            'owner_id' => ['required', 'uuid'],
            'file_type' => ['required', 'string'],
            'file' => ['required', 'file'],
        ]);

        // For file uploads, allow if user created the document or has clearance
        $document = $this->resolveOwnerDocument($data['owner_type'], $data['owner_id'], $profile->organization_id, $currentSchoolId, $user, true);

        $tempModel = new DocumentFile(['owner_type' => $data['owner_type'], 'owner_id' => $document->id]);
        $this->authorize('create', $tempModel);

        $file = $request->file('file');

        // Store DMS file using FileStorageService (PRIVATE storage, school-scoped)
        $path = $this->fileStorageService->storeDmsFile(
            $file,
            $profile->organization_id,
            $document->school_id ?? 'general',
            $data['owner_type'],
            $document->id
        );

        $latestVersion = DocumentFile::where('owner_type', $data['owner_type'])
            ->where('owner_id', $document->id)
            ->max('version') ?? 0;

        $record = DocumentFile::create([
            'organization_id' => $profile->organization_id,
            'school_id' => $currentSchoolId,
            'owner_type' => $data['owner_type'],
            'owner_id' => $document->id,
            'file_type' => $data['file_type'],
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $this->fileStorageService->getMimeTypeFromExtension($file->getClientOriginalName()),
            'size_bytes' => $file->getSize(),
            'storage_path' => $path,
            'version' => $latestVersion + 1,
            'uploaded_by_user_id' => $user->id,
        ]);

        return response()->json($record, 201);
    }

    public function download(string $id, Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.files.download');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [$user, $profile, $currentSchoolId] = $context;

        $file = DocumentFile::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->firstOrFail();

        $this->resolveOwnerDocument($file->owner_type, $file->owner_id, $profile->organization_id, $currentSchoolId, $user);
        $this->authorize('view', $file);

        // Download file using FileStorageService
        return $this->fileStorageService->downloadFile($file->storage_path, $file->original_name);
    }

    private function resolveOwnerDocument(string $ownerType, string $ownerId, string $organizationId, string $currentSchoolId, $user, bool $skipSecurityCheck = false)
    {
        $model = $ownerType === 'incoming' ? IncomingDocument::class : OutgoingDocument::class;
        $document = $model::where('id', $ownerId)
            ->where('organization_id', $organizationId)
            ->where('school_id', $currentSchoolId)
            ->firstOrFail();

        // For file operations, allow access if:
        // 1. User created the document (created_by = user->id), OR
        // 2. User has clearance to view the document, OR
        // 3. Document has no security level
        if (!$skipSecurityCheck && $document->security_level_key) {
            $userCreatedDocument = isset($document->created_by) && $document->created_by === $user->id;
            $hasClearance = $this->securityGateService->canView($user, $document->security_level_key, $document->organization_id);
            
            if (!$userCreatedDocument && !$hasClearance) {
                abort(403, 'Insufficient clearance');
            }
        }

        return $document;
    }
}
