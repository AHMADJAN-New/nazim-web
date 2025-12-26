<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\StudentDocument;
use App\Http\Requests\StoreStudentDocumentRequest;
use App\Services\Storage\FileStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class StudentDocumentController extends Controller
{
    public function __construct(
        private FileStorageService $fileStorageService
    ) {}
    /**
     * Get accessible organization IDs for the current user
     */
    private function getAccessibleOrgIds($profile): array
    {
        // All users are restricted to their own organization
        if ($profile->organization_id) {
            return [$profile->organization_id];
        }
        
        return [];
    }

    /**
     * Display a listing of documents for a student
     */
    public function index(Request $request, string $studentId)
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
            if (!$user->hasPermissionTo('student_documents.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for student_documents.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Check student exists and user has access
        $student = Student::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($studentId);
        if (!$student) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        $documents = StudentDocument::where('student_id', $studentId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->orderBy('created_at', 'desc')
            ->get();

        // Enrich with uploaded_by profile data manually
        $uploadedByIds = $documents->pluck('uploaded_by')->filter()->unique()->toArray();
        $profiles = [];
        if (!empty($uploadedByIds)) {
            $profiles = DB::table('profiles')
                ->whereIn('id', $uploadedByIds)
                ->select('id', 'full_name', 'email')
                ->get()
                ->keyBy('id');
        }

        $enrichedDocuments = $documents->map(function ($doc) use ($profiles) {
            $uploadedByProfile = $profiles->get($doc->uploaded_by);
            return [
                ...$doc->toArray(),
                'uploaded_by_profile' => $uploadedByProfile ? [
                    'id' => $uploadedByProfile->id,
                    'full_name' => $uploadedByProfile->full_name,
                    'email' => $uploadedByProfile->email,
                ] : null,
            ];
        });

        return response()->json($enrichedDocuments);
    }

    /**
     * Store a newly created document for a student
     */
    public function store(StoreStudentDocumentRequest $request, string $studentId)
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
            if (!$user->hasPermissionTo('student_documents.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for student_documents.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Check student exists and user has access
        $student = Student::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($studentId);
        if (!$student) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        $file = $request->file('file');

        // Store file using FileStorageService (PRIVATE storage for student documents)
        $filePath = $this->fileStorageService->storeStudentDocument(
            $file,
            $student->organization_id,
            $studentId,
            $student->school_id,
            $request->document_type
        );

        // Create document record
        $document = StudentDocument::create([
            'student_id' => $studentId,
            'organization_id' => $profile->organization_id,
            'school_id' => $currentSchoolId,
            'document_type' => $request->document_type,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $filePath,
            'file_size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
            'description' => $request->description,
            'uploaded_by' => $user->id,
        ]);

        // Enrich with uploaded_by profile data
        $uploadedByProfile = DB::table('profiles')
            ->where('id', $user->id)
            ->select('id', 'full_name', 'email')
            ->first();

        $documentArray = $document->toArray();
        $documentArray['uploaded_by_profile'] = $uploadedByProfile ? [
            'id' => $uploadedByProfile->id,
            'full_name' => $uploadedByProfile->full_name,
            'email' => $uploadedByProfile->email,
        ] : null;

        return response()->json($documentArray, 201);
    }

    /**
     * Remove the specified document (soft delete)
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
            if (!$user->hasPermissionTo('student_documents.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for student_documents.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $document = StudentDocument::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$document) {
            return response()->json(['error' => 'Document not found'], 404);
        }

<<<<<<< HEAD
        $orgIds = $this->getAccessibleOrgIds($profile);

        if (!in_array($document->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot delete document from different organization'], 403);
        }

        // Delete file from storage using FileStorageService
        if ($document->file_path) {
            $this->fileStorageService->deleteFile($document->file_path);
        }

        // Soft delete
        $document->delete();

        return response()->noContent();
    }

    /**
     * Download/view the specified document
     */
    public function download(string $id)
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
            if (!$user->hasPermissionTo('student_documents.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for student_documents.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $document = StudentDocument::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$document) {
            return response()->json(['error' => 'Document not found'], 404);
        }

<<<<<<< HEAD
        $orgIds = $this->getAccessibleOrgIds($profile);

        if (!in_array($document->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot access document from different organization'], 403);
        }

        // Check if file exists using FileStorageService
        if (!$this->fileStorageService->fileExists($document->file_path)) {
            return response()->json(['error' => 'File not found'], 404);
        }

        // Get file content using FileStorageService
        $file = $this->fileStorageService->getFile($document->file_path);
        $mimeType = $document->mime_type ?? $this->fileStorageService->getMimeTypeFromExtension($document->file_path);

        return response($file, 200)
            ->header('Content-Type', $mimeType)
            ->header('Content-Disposition', 'inline; filename="' . $document->file_name . '"');
    }
}



