<?php

namespace App\Http\Controllers;

use App\Models\ExamDocument;
use App\Models\Exam;
use App\Services\Storage\FileStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ExamDocumentController extends Controller
{
    public function __construct(
        private FileStorageService $fileStorageService
    ) {}
    
    private function getProfile($user)
    {
        return DB::table('profiles')->where('id', (string) $user->id)->first();
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('exam_documents.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[ExamDocumentController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $query = ExamDocument::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at');

        if ($request->filled('exam_id')) {
            $query->where('exam_id', $request->exam_id);
        }

        if ($request->filled('exam_class_id')) {
            $query->where('exam_class_id', $request->exam_class_id);
        }

        if ($request->filled('exam_student_id')) {
            $query->where('exam_student_id', $request->exam_student_id);
        }

        if ($request->filled('document_type')) {
            $query->where('document_type', $request->document_type);
        }

        return response()->json($query->orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('exam_documents.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'exam_id' => 'required|uuid|exists:exams,id',
            'exam_class_id' => 'nullable|uuid|exists:exam_classes,id',
            'exam_student_id' => 'nullable|uuid|exists:exam_students,id',
            'document_type' => 'required|string|in:question_paper,answer_key,instruction,result,grade_sheet,other',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'file' => 'required|file|max:10240', // 10MB max - accepts all file types
        ]);

        // Verify exam belongs to organization
        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($validated['exam_id']);

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $file = $request->file('file');

        // Store document using FileStorageService (PRIVATE storage for exam documents)
        $path = $this->fileStorageService->storeExamDocument(
            $file,
            $profile->organization_id,
            $validated['exam_id'],
            $currentSchoolId,
            $validated['document_type']
        );

        $document = ExamDocument::create([
            'organization_id' => $profile->organization_id,
            'school_id' => $currentSchoolId,
            'exam_id' => $validated['exam_id'],
            'exam_class_id' => $validated['exam_class_id'] ?? null,
            'exam_student_id' => $validated['exam_student_id'] ?? null,
            'document_type' => $validated['document_type'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'mime_type' => $this->fileStorageService->getMimeTypeFromExtension($file->getClientOriginalName()),
            'file_size' => $file->getSize(),
            'uploaded_by' => (string) $user->id,
        ]);

        return response()->json($document, 201);
    }

    public function show(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $document = ExamDocument::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$document) {
            return response()->json(['error' => 'Document not found'], 404);
        }

        return response()->json($document);
    }

    public function download(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $document = ExamDocument::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$document) {
            return response()->json(['error' => 'Document not found'], 404);
        }

        // Check if file exists using FileStorageService
        if (!$this->fileStorageService->fileExists($document->file_path)) {
            return response()->json(['error' => 'File not found on storage'], 404);
        }

        // Download file using FileStorageService
        return $this->fileStorageService->downloadFile(
            $document->file_path,
            $document->file_name
        );
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('exam_documents.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $document = ExamDocument::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$document) {
            return response()->json(['error' => 'Document not found'], 404);
        }

        // Delete file from storage using FileStorageService
        if ($document->file_path) {
            $this->fileStorageService->deleteFile($document->file_path);
        }

        $document->delete();

        return response()->noContent();
    }
}
