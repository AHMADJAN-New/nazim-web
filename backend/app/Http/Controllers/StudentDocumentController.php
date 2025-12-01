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
        if ($profile->role === 'super_admin' && $profile->organization_id === null) {
            return DB::table('organizations')
                ->whereNull('deleted_at')
                ->pluck('id')
                ->toArray();
        }
        
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

        try {
            if (!$user->hasPermissionTo('students.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::error("Permission check failed for students.read: " . $e->getMessage());
            return response()->json(['error' => 'Permission check failed'], 500);
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

        $documents = StudentDocument::with(['uploadedBy'])
            ->where('student_id', $studentId)
            ->whereNull('deleted_at')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($documents);
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

        try {
            if (!$user->hasPermissionTo('students.manage_documents')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::error("Permission check failed for students.manage_documents: " . $e->getMessage());
            return response()->json(['error' => 'Permission check failed'], 500);
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

        $document->load(['uploadedBy']);

        return response()->json($document, 201);
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

        try {
            if (!$user->hasPermissionTo('students.manage_documents')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::error("Permission check failed for students.manage_documents: " . $e->getMessage());
            return response()->json(['error' => 'Permission check failed'], 500);
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
}

