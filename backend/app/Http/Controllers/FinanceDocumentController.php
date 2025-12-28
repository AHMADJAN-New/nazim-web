<?php

namespace App\Http\Controllers;

use App\Models\FinanceDocument;
use App\Services\Storage\FileStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class FinanceDocumentController extends Controller
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
            if (!$user->hasPermissionTo('finance_documents.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[FinanceDocumentController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $query = FinanceDocument::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at');

        if ($request->filled('document_type')) {
            $query->where('document_type', $request->document_type);
        }

        if ($request->filled('student_id')) {
            $query->where('student_id', $request->student_id);
        }

        if ($request->filled('staff_id')) {
            $query->where('staff_id', $request->staff_id);
        }

        if ($request->filled('fee_collection_id')) {
            $query->where('fee_collection_id', $request->fee_collection_id);
        }

        if ($request->filled('donor_id')) {
            $query->where('donor_id', $request->donor_id);
        }

        if ($request->filled('project_id')) {
            $query->where('project_id', $request->project_id);
        }

        if ($request->filled('income_entry_id')) {
            $query->where('income_entry_id', $request->income_entry_id);
        }

        if ($request->filled('expense_entry_id')) {
            $query->where('expense_entry_id', $request->expense_entry_id);
        }

        if ($request->filled('account_id')) {
            $query->where('account_id', $request->account_id);
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('document_date', [$request->start_date, $request->end_date]);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('title', 'ilike', "%{$search}%")
                  ->orWhere('description', 'ilike', "%{$search}%")
                  ->orWhere('reference_number', 'ilike', "%{$search}%");
            });
        }

        return response()->json($query->orderBy('document_date', 'desc')->orderBy('created_at', 'desc')->get());
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
            if (!$user->hasPermissionTo('finance_documents.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'document_type' => 'required|string|in:invoice,receipt,budget,report,tax_document,voucher,bank_statement,other',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'fee_collection_id' => 'nullable|uuid|exists:fee_collections,id',
            'student_id' => 'nullable|uuid|exists:students,id',
            'staff_id' => 'nullable|uuid|exists:staff,id',
            'donor_id' => 'nullable|uuid|exists:donors,id',
            'project_id' => 'nullable|uuid|exists:finance_projects,id',
            'income_entry_id' => 'nullable|uuid|exists:income_entries,id',
            'expense_entry_id' => 'nullable|uuid|exists:expense_entries,id',
            'account_id' => 'nullable|uuid|exists:finance_accounts,id',
            'amount' => 'nullable|numeric|min:0',
            'reference_number' => 'nullable|string|max:100',
            'document_date' => 'nullable|date',
            'file' => 'required|file|max:20480', // 20MB max
        ]);

        $file = $request->file('file');

        // Store document using FileStorageService (PRIVATE storage for finance documents)
        $path = $this->fileStorageService->storeFinanceDocument(
            $file,
            $profile->organization_id,
            $currentSchoolId,
            $validated['document_type']
        );

        $document = FinanceDocument::create([
            'organization_id' => $profile->organization_id,
            'school_id' => $currentSchoolId,
            'document_type' => $validated['document_type'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'fee_collection_id' => $validated['fee_collection_id'] ?? null,
            'student_id' => $validated['student_id'] ?? null,
            'staff_id' => $validated['staff_id'] ?? null,
            'donor_id' => $validated['donor_id'] ?? null,
            'project_id' => $validated['project_id'] ?? null,
            'income_entry_id' => $validated['income_entry_id'] ?? null,
            'expense_entry_id' => $validated['expense_entry_id'] ?? null,
            'account_id' => $validated['account_id'] ?? null,
            'amount' => $validated['amount'] ?? null,
            'reference_number' => $validated['reference_number'] ?? null,
            'document_date' => $validated['document_date'] ?? now()->toDateString(),
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

        $document = FinanceDocument::where('organization_id', $profile->organization_id)
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

        try {
            if (!$user->hasPermissionTo('finance_documents.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $document = FinanceDocument::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$document) {
            return response()->json(['error' => 'Document not found'], 404);
        }

        return $this->fileStorageService->downloadFile($document->file_path, $document->file_name);
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
            if (!$user->hasPermissionTo('finance_documents.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $document = FinanceDocument::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($id);

        if (!$document) {
            return response()->json(['error' => 'Document not found'], 404);
        }

        // Soft delete the document
        $document->delete();

        // Optionally delete the file from storage
        try {
            $this->fileStorageService->deleteFile($document->file_path);
        } catch (\Exception $e) {
            Log::warning('[FinanceDocumentController] Failed to delete file', ['error' => $e->getMessage()]);
        }

        return response()->noContent();
    }
}

