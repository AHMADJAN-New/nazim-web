<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\StudentDocument;
use App\Http\Requests\StoreStudentDocumentRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class StudentDocumentController extends Controller
{
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

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('student_documents.read', $profile->organization_id)) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for student_documents.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Check student exists and user has access
        $student = Student::whereNull('deleted_at')->find($studentId);
        if (!$student) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (!in_array($student->organization_id, $orgIds)) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        $documents = StudentDocument::where('student_id', $studentId)
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

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('student_documents.create', $profile->organization_id)) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for student_documents.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Check student exists and user has access
        $student = Student::whereNull('deleted_at')->find($studentId);
        if (!$student) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (!in_array($student->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot add document to student from different organization'], 403);
        }

        $file = $request->file('file');
        $timestamp = time();
        $sanitizedFileName = preg_replace('/[^a-zA-Z0-9._-]/', '_', $file->getClientOriginalName());
        $filePath = "{$student->organization_id}/students/{$studentId}/documents/{$timestamp}_{$sanitizedFileName}";

        // Store file
        Storage::disk('local')->put($filePath, file_get_contents($file));

        // Create document record
        $document = StudentDocument::create([
            'student_id' => $studentId,
            'organization_id' => $student->organization_id,
            'school_id' => $student->school_id,
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

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('student_documents.delete', $profile->organization_id)) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for student_documents.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $document = StudentDocument::whereNull('deleted_at')->find($id);

        if (!$document) {
            return response()->json(['error' => 'Document not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (!in_array($document->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot delete document from different organization'], 403);
        }

        // Soft delete
        $document->delete();

        return response()->json(['message' => 'Document deleted successfully']);
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

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('student_documents.read', $profile->organization_id)) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for student_documents.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $document = StudentDocument::whereNull('deleted_at')->find($id);

        if (!$document) {
            return response()->json(['error' => 'Document not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (!in_array($document->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot access document from different organization'], 403);
        }

        if (!Storage::disk('local')->exists($document->file_path)) {
            return response()->json(['error' => 'File not found'], 404);
        }

        $file = Storage::disk('local')->get($document->file_path);
        $mimeType = $document->mime_type ?? Storage::disk('local')->mimeType($document->file_path);

        return response($file, 200)
            ->header('Content-Type', $mimeType)
            ->header('Content-Disposition', 'inline; filename="' . $document->file_name . '"');
    }
}

