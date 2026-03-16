<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\OrgFinanceScope;
use App\Models\FacilityDocument;
use App\Models\OrgFacility;
use App\Services\Storage\FileStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class OrgFacilityDocumentController extends Controller
{
    use OrgFinanceScope;

    public function __construct(
        private FileStorageService $fileStorageService
    ) {}

    public function index(Request $request, string $facilityId)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $facility = OrgFacility::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->find($facilityId);

        if (! $facility) {
            return response()->json(['error' => 'Facility not found'], 404);
        }

        $documents = FacilityDocument::where('facility_id', $facilityId)
            ->whereNull('deleted_at')
            ->orderBy('document_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($documents);
    }

    public function store(Request $request, string $facilityId)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceCreate($request);

        $facility = OrgFacility::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->find($facilityId);

        if (! $facility) {
            return response()->json(['error' => 'Facility not found'], 404);
        }

        $validated = $request->validate([
            'document_type' => 'required|string|max:50',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'document_date' => 'nullable|date',
            'file' => 'required|file|max:20480',
        ]);

        $file = $request->file('file');
        $path = $this->fileStorageService->storeFacilityDocument(
            $file,
            $orgId,
            $facilityId,
            $validated['document_type']
        );

        $document = FacilityDocument::create([
            'facility_id' => $facilityId,
            'organization_id' => $orgId,
            'document_type' => $validated['document_type'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'document_date' => $validated['document_date'] ?? now()->toDateString(),
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'mime_type' => $this->fileStorageService->getMimeTypeFromExtension($file->getClientOriginalName()),
            'file_size' => $file->getSize(),
            'uploaded_by' => (string) $request->user()->id,
        ]);

        return response()->json($document, 201);
    }

    public function show(Request $request, string $facilityId, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $document = FacilityDocument::where('id', $id)
            ->where('facility_id', $facilityId)
            ->where('organization_id', $orgId)
            ->whereNull('deleted_at')
            ->first();

        if (! $document) {
            return response()->json(['error' => 'Document not found'], 404);
        }

        return response()->json($document);
    }

    public function download(Request $request, string $facilityId, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $document = FacilityDocument::where('id', $id)
            ->where('facility_id', $facilityId)
            ->where('organization_id', $orgId)
            ->whereNull('deleted_at')
            ->first();

        if (! $document) {
            return response()->json(['error' => 'Document not found'], 404);
        }

        return $this->fileStorageService->downloadFile($document->file_path, $document->file_name);
    }

    public function destroy(Request $request, string $facilityId, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceCreate($request);

        $document = FacilityDocument::where('id', $id)
            ->where('facility_id', $facilityId)
            ->where('organization_id', $orgId)
            ->whereNull('deleted_at')
            ->first();

        if (! $document) {
            return response()->json(['error' => 'Document not found'], 404);
        }

        $document->delete();

        try {
            $this->fileStorageService->deleteFile($document->file_path);
        } catch (\Exception $e) {
            Log::warning('[OrgFacilityDocumentController] Failed to delete file', ['error' => $e->getMessage()]);
        }

        return response()->noContent();
    }
}
