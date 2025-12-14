<?php

namespace App\Http\Controllers\Dms;

use App\Models\IncomingDocument;
use App\Models\OutgoingDocument;
use App\Models\DocumentFile;
use App\Services\SecurityGateService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DocumentFilesController extends BaseDmsController
{
    public function __construct(private SecurityGateService $securityGateService)
    {
    }

    public function index(Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.incoming.read');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [$user, $profile, $schoolIds] = $context;

        $request->validate([
            'owner_type' => ['required', 'in:incoming,outgoing'],
            'owner_id' => ['required', 'uuid'],
        ]);

        $document = $this->resolveOwnerDocument($request->owner_type, $request->owner_id, $profile->organization_id, $schoolIds, $user);

        $files = DocumentFile::where('organization_id', $profile->organization_id)
            ->where('owner_type', $request->owner_type)
            ->where('owner_id', $document->id)
            ->orderByDesc('version')
            ->get();

        $files->each(fn ($file) => $this->authorize('view', $file));

        return $files;
    }

    public function store(Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.incoming.update');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [$user, $profile, $schoolIds] = $context;

        $data = $request->validate([
            'owner_type' => ['required', 'in:incoming,outgoing'],
            'owner_id' => ['required', 'uuid'],
            'file_type' => ['required', 'string'],
            'file' => ['required', 'file'],
        ]);

        $file = $request->file('file');
        $path = $file->store('document-files');

        $document = $this->resolveOwnerDocument($data['owner_type'], $data['owner_id'], $profile->organization_id, $schoolIds, $user);

        $tempModel = new DocumentFile(['owner_type' => $data['owner_type'], 'owner_id' => $document->id]);
        $this->authorize('create', $tempModel);

        $latestVersion = DocumentFile::where('owner_type', $data['owner_type'])
            ->where('owner_id', $document->id)
            ->max('version') ?? 0;

        $record = DocumentFile::create([
            'organization_id' => $profile->organization_id,
            'school_id' => $document->school_id,
            'owner_type' => $data['owner_type'],
            'owner_id' => $document->id,
            'file_type' => $data['file_type'],
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'size_bytes' => $file->getSize(),
            'storage_path' => $path,
            'version' => $latestVersion + 1,
            'uploaded_by_user_id' => $user->id,
        ]);

        return response()->json($record, 201);
    }

    public function download(string $id, Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.incoming.read');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [$user, $profile, $schoolIds] = $context;

        $file = DocumentFile::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->firstOrFail();

        $this->resolveOwnerDocument($file->owner_type, $file->owner_id, $profile->organization_id, $schoolIds, $user);
        $this->authorize('view', $file);

        return Storage::download($file->storage_path, $file->original_name);
    }

    private function resolveOwnerDocument(string $ownerType, string $ownerId, string $organizationId, array $schoolIds, $user)
    {
        $model = $ownerType === 'incoming' ? IncomingDocument::class : OutgoingDocument::class;
        $document = $model::where('id', $ownerId)
            ->where('organization_id', $organizationId)
            ->firstOrFail();

        if ($response = $this->ensureSchoolAccess($document->school_id, $schoolIds)) {
            $payload = (array) $response->getData(true);
            abort($response->getStatusCode(), $payload['error'] ?? 'School not accessible');
        }

        if ($document->security_level_key && !$this->securityGateService->canView($user, $document->security_level_key, $document->organization_id)) {
            abort(403, 'Insufficient clearance');
        }

        return $document;
    }
}
