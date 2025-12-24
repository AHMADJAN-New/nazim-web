<?php

namespace App\Http\Controllers;

use App\Models\Staff;
use App\Models\StaffDocument;
use App\Services\Storage\FileStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class StaffDocumentController extends Controller
{
    public function __construct(
        private FileStorageService $fileStorageService
    ) {}
    /**
     * Display a listing of documents for a staff member
     */
    public function index(string $staffId)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $staff = Staff::whereNull('deleted_at')->find($staffId);

        if (!$staff) {
            return response()->json(['error' => 'Staff member not found'], 404);
        }

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

        // Check organization access (user's organization only)
        if ($staff->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Staff member not found'], 404);
        }

        $documents = StaffDocument::where('staff_id', $staffId)
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

        $staff = Staff::whereNull('deleted_at')->find($staffId);

        if (!$staff) {
            return response()->json(['error' => 'Staff member not found'], 404);
        }

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
            Log::warning("Permission check failed for staff_documents.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Check organization access (user's organization only)
        if ($staff->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot upload document for staff from different organization'], 403);
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
            'school_id' => $staff->school_id,
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

        $document = StaffDocument::whereNull('deleted_at')->find($id);

        if (!$document) {
            return response()->json(['error' => 'Document not found'], 404);
        }

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
            Log::warning("Permission check failed for staff_documents.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Get accessible organization IDs (user's organization only)
        $orgIds = [$profile->organization_id];

        // Check organization access
        if (!in_array($document->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot delete document from different organization'], 403);
        }

        // Delete file from storage using FileStorageService
        if ($document->file_path) {
            $this->fileStorageService->deleteFile($document->file_path);
        }

        // Soft delete
        $document->update(['deleted_at' => now()]);

        return response()->json(['message' => 'Document deleted successfully']);
    }
}



