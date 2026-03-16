<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\OrgFinanceScope;
use App\Models\FinanceDocument;
use App\Services\ActivityLogService;
use App\Services\Notifications\NotificationService;
use App\Services\Storage\FileStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Org-scoped finance documents (school_id = null).
 * Same permissions as school finance documents: finance_documents.read, finance_documents.create, finance_documents.delete.
 */
class OrgFinanceDocumentController extends Controller
{
    use OrgFinanceScope;

    public function __construct(
        private FileStorageService $fileStorageService,
        private NotificationService $notificationService,
        private ActivityLogService $activityLogService
    ) {
    }

    public function index(Request $request)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $this->requireFinanceDocumentsRead($request);

        $query = FinanceDocument::where('organization_id', $orgId)
            ->whereNull('school_id')
            ->whereNull('deleted_at');

        if ($request->filled('document_type')) {
            $query->where('document_type', $request->document_type);
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
            $query->where(function ($q) use ($search) {
                $q->where('title', 'ilike', "%{$search}%")
                    ->orWhere('description', 'ilike', "%{$search}%")
                    ->orWhere('reference_number', 'ilike', "%{$search}%");
            });
        }

        return response()->json($query->orderBy('document_date', 'desc')->orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);
        $this->requireFinanceDocumentsCreate($request);

        $validated = $request->validate([
            'document_type' => 'required|string|in:invoice,receipt,budget,report,tax_document,voucher,bank_statement,other',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'donor_id' => 'nullable|uuid|exists:donors,id',
            'project_id' => 'nullable|uuid|exists:finance_projects,id',
            'income_entry_id' => 'nullable|uuid|exists:income_entries,id',
            'expense_entry_id' => 'nullable|uuid|exists:expense_entries,id',
            'account_id' => 'nullable|uuid|exists:finance_accounts,id',
            'amount' => 'nullable|numeric|min:0',
            'reference_number' => 'nullable|string|max:100',
            'document_date' => 'nullable|date',
            'file' => 'required|file|max:20480',
        ]);

        $file = $request->file('file');
        $path = $this->fileStorageService->storeFinanceDocument(
            $file,
            $orgId,
            null,
            $validated['document_type']
        );

        $document = FinanceDocument::create([
            'organization_id' => $orgId,
            'school_id' => null,
            'document_type' => $validated['document_type'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
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
            'uploaded_by' => (string) $request->user()->id,
        ]);

        try {
            $this->activityLogService->logCreate(
                subject: $document,
                description: "Created org finance document: {$document->title} ({$document->document_type})",
                properties: [
                    'document_id' => $document->id,
                    'document_type' => $document->document_type,
                    'title' => $document->title,
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log org finance document creation: '.$e->getMessage());
        }

        return response()->json($document, 201);
    }

    public function show(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);
        $this->requireFinanceDocumentsRead($request);

        $document = FinanceDocument::where('organization_id', $orgId)
            ->whereNull('school_id')
            ->whereNull('deleted_at')
            ->find($id);

        if (! $document) {
            return response()->json(['error' => 'Document not found'], 404);
        }

        return response()->json($document);
    }

    public function download(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);
        $this->requireFinanceDocumentsRead($request);

        $document = FinanceDocument::where('organization_id', $orgId)
            ->whereNull('school_id')
            ->whereNull('deleted_at')
            ->find($id);

        if (! $document) {
            return response()->json(['error' => 'Document not found'], 404);
        }

        return $this->fileStorageService->downloadFile($document->file_path, $document->file_name);
    }

    public function destroy(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);
        $this->requireFinanceDocumentsDelete($request);

        $document = FinanceDocument::where('organization_id', $orgId)
            ->whereNull('school_id')
            ->whereNull('deleted_at')
            ->find($id);

        if (! $document) {
            return response()->json(['error' => 'Document not found'], 404);
        }

        $title = $document->title;
        $document->delete();

        try {
            $this->fileStorageService->deleteFile($document->file_path);
        } catch (\Exception $e) {
            Log::warning('[OrgFinanceDocumentController] Failed to delete file', ['error' => $e->getMessage()]);
        }

        try {
            $this->activityLogService->logDelete(
                subject: $document,
                description: "Deleted org finance document: {$title}",
                properties: ['deleted_document_id' => $id],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log org finance document deletion: '.$e->getMessage());
        }

        return response()->noContent();
    }

    private function requireFinanceDocumentsRead(Request $request): void
    {
        $user = $request->user();
        try {
            if (! $user->hasPermissionTo('finance_documents.read')) {
                abort(403, 'This action is unauthorized');
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for finance_documents.read: '.$e->getMessage());
            abort(403, 'This action is unauthorized');
        }
    }

    private function requireFinanceDocumentsCreate(Request $request): void
    {
        $user = $request->user();
        try {
            if (! $user->hasPermissionTo('finance_documents.create')) {
                abort(403, 'This action is unauthorized');
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for finance_documents.create: '.$e->getMessage());
            abort(403, 'This action is unauthorized');
        }
    }

    private function requireFinanceDocumentsDelete(Request $request): void
    {
        $user = $request->user();
        try {
            if (! $user->hasPermissionTo('finance_documents.delete')) {
                abort(403, 'This action is unauthorized');
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for finance_documents.delete: '.$e->getMessage());
            abort(403, 'This action is unauthorized');
        }
    }
}
