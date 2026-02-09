<?php

namespace App\Http\Controllers;

use App\Models\Staff;
use App\Models\StaffDocument;
use App\Services\Storage\FileStorageService;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class StaffDocumentController extends Controller
{
    public function __construct(
        private FileStorageService $fileStorageService,
        private ActivityLogService $activityLogService
    ) {}
    /**
     * Display a listing of documents for a staff member
     */
    public function index(Request $request, string $staffId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('staff_documents.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for staff_documents.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $staff = Staff::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($staffId);

        if (!$staff) {
            return response()->json(['error' => 'Staff member not found'], 404);
        }

        $documents = StaffDocument::where('staff_id', $staffId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($documents);
    }

    /**
     * Store a newly created document
     */
    public function store(Request $request, string $staffId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('staff_documents.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for staff_documents.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $staff = Staff::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($staffId);

        if (!$staff) {
            return response()->json(['error' => 'Staff member not found'], 404);
        }

        $request->validate([
            'file' => 'required|file|max:10240', // 10MB max
            'document_type' => 'required|string|max:100',
            'description' => 'nullable|string',
        ]);

        $file = $request->file('file');

        // Store document using FileStorageService (PRIVATE storage for staff documents)
        $filePath = $this->fileStorageService->storeStaffDocument(
            $file,
            $staff->organization_id,
            $staffId,
            $staff->school_id,
            $request->document_type
        );

        // Create document record
        $document = StaffDocument::create([
            'staff_id' => $staff->id,
            'organization_id' => $staff->organization_id,
            'school_id' => $currentSchoolId,
            'document_type' => $request->document_type,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $filePath,
            'file_size' => $file->getSize(),
            'mime_type' => $this->fileStorageService->getMimeTypeFromExtension($file->getClientOriginalName()),
            'description' => $request->description ?? null,
            'uploaded_by' => $user->id,
        ]);

        // Return download URL for private file
        $downloadUrl = $this->fileStorageService->getPrivateDownloadUrl($filePath);

        // Log staff document creation
        try {
            $staffName = $staff->full_name ?? 'Unknown';
            $this->activityLogService->logCreate(
                subject: $document,
                description: "Created staff document: {$document->file_name} for {$staffName}",
                properties: [
                    'document_id' => $document->id,
                    'staff_id' => $staffId,
                    'document_type' => $document->document_type,
                    'file_name' => $document->file_name,
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log staff document creation: ' . $e->getMessage());
        }

        return response()->json([
            'document' => $document,
            'download_url' => $downloadUrl,
        ], 201);
    }

    /**
     * Remove the specified document
     */
    public function destroy(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $currentSchoolId = $this->getCurrentSchoolId(request());

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('staff_documents.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for staff_documents.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $document = StaffDocument::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$document) {
            return response()->json(['error' => 'Document not found'], 404);
        }

        // Capture data before deletion
        $documentData = $document->toArray();
        $documentName = $document->file_name;
        $staffId = $document->staff_id;

        // Delete file from storage using FileStorageService
        if ($document->file_path) {
            $this->fileStorageService->deleteFile($document->file_path);
        }

        // Soft delete
        $document->delete();

        // Log staff document deletion
        try {
            $this->activityLogService->logDelete(
                subject: $document,
                description: "Deleted staff document: {$documentName}",
                properties: [
                    'deleted_document' => $documentData,
                    'staff_id' => $staffId,
                ],
                request: request()
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log staff document deletion: ' . $e->getMessage());
        }

        return response()->noContent();
    }
}



