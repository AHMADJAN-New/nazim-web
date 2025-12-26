<?php

namespace App\Http\Controllers\Dms;

use App\Models\OutgoingDocument;
use App\Models\DocumentFile;
use App\Models\DocumentSetting;
use App\Models\LetterTemplate;
use App\Services\DocumentPdfService;
use App\Services\DocumentNumberingService;
use App\Services\DocumentRenderingService;
use App\Services\FieldMappingService;
use App\Services\SecurityGateService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class OutgoingDocumentsController extends BaseDmsController
{
    public function __construct(
        private DocumentNumberingService $numberingService,
        private SecurityGateService $securityGateService,
        private FieldMappingService $fieldMappingService,
        private DocumentRenderingService $renderingService,
        private DocumentPdfService $pdfService,
    ) {
    }

    public function index(Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.outgoing.read');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        $this->authorize('viewAny', OutgoingDocument::class);
        [$user, $profile, $currentSchoolId] = $context;

        $query = OutgoingDocument::query()
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId);

        if ($request->filled('subject')) {
            $query->where('subject', 'ilike', '%' . $request->subject . '%');
        }
        if ($request->filled('recipient_type')) {
            $query->where('recipient_type', $request->recipient_type);
        }
        if ($request->filled('security_level_key')) {
            $query->where('security_level_key', $request->security_level_key);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('outdoc_number')) {
            $query->where(function ($q) use ($request) {
                $q->where('outdoc_number', $request->outdoc_number)
                    ->orWhere('full_outdoc_number', 'ilike', '%' . $request->outdoc_number . '%');
            });
        }
        if ($request->filled('from_date')) {
            $query->whereDate('issue_date', '>=', $request->from_date);
        }
        if ($request->filled('to_date')) {
            $query->whereDate('issue_date', '<=', $request->to_date);
        }

        $query->where(function ($q) use ($user, $profile) {
            $q->whereNull('security_level_key')
                ->orWhereExists(function ($sub) use ($user, $profile) {
                    $sub->select(DB::raw(1))
                        ->from('security_levels')
                        ->whereColumn('security_levels.key', 'outgoing_documents.security_level_key')
                        ->where('security_levels.organization_id', $profile->organization_id)
                        ->whereRaw('? >= security_levels.rank', [$this->userClearanceRank($user, $profile->organization_id)]);
                });
        });

        $query->orderByDesc('issue_date')->orderByDesc('created_at');

        if ($request->boolean('paginate', true)) {
            $perPage = min(100, $request->integer('per_page', 20));
            return $query->paginate($perPage);
        }

        return $query->limit(200)->get();
    }

    public function store(Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.outgoing.create');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        $this->authorize('create', OutgoingDocument::class);
        [$user, $profile, $currentSchoolId] = $context;

        $validationRules = [
            'security_level_key' => ['nullable', 'string'],
            'recipient_type' => ['required', 'string'],
            'recipient_id' => ['nullable', 'uuid'],
            'external_recipient_name' => ['nullable', 'string', 'max:255'],
            'external_recipient_org' => ['nullable', 'string', 'max:255'],
            'recipient_address' => ['nullable', 'string', 'max:255'],
            'subject' => ['required', 'string', 'max:500'],
            'description' => ['nullable', 'string'],
            'pages_count' => ['nullable', 'integer', 'min:0'],
            'attachments_count' => ['nullable', 'integer', 'min:0'],
            'body_html' => ['nullable', 'string'],
            'template_id' => ['nullable', 'uuid', 'exists:letter_templates,id'],
            'letterhead_id' => ['nullable', 'uuid', 'exists:letterheads,id'],
            'template_variables' => ['nullable', 'array'],
            'issue_date' => ['required', 'date'],
            'signed_by_user_id' => ['nullable', 'uuid'],
            'status' => ['nullable', 'string'],
            'announcement_scope' => ['nullable', 'array'],
            'table_payload' => ['nullable', 'array'],
            'is_manual_number' => ['boolean'],
            'manual_outdoc_number' => ['nullable', 'string'],
        ];

        // Only validate academic_year_id if column exists
        if (Schema::hasColumn('outgoing_documents', 'academic_year_id')) {
            $validationRules['academic_year_id'] = ['nullable', 'uuid', 'exists:academic_years,id'];
        }

        $data = $request->validate($validationRules);
        $data['school_id'] = $currentSchoolId;

        if (!$request->boolean('is_manual_number')) {
            $settings = DocumentSetting::firstOrCreate(
                ['organization_id' => $profile->organization_id, 'school_id' => $currentSchoolId],
                []
            );

            // Get academic year if provided and column exists
            $academicYear = null;
            if (!empty($data['academic_year_id']) && Schema::hasColumn('outgoing_documents', 'academic_year_id')) {
                $academicYear = \App\Models\AcademicYear::where('id', $data['academic_year_id'])
                    ->where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->first();
            }

            $yearKey = $this->numberingService->getYearKey(
                $settings->year_mode ?? 'gregorian',
                $academicYear
            );
            $sequence = $this->numberingService->generateOutgoingNumber(
                $profile->organization_id,
                $currentSchoolId,
                $settings->outgoing_prefix ?? 'OUT',
                $yearKey
            );
            $data['outdoc_prefix'] = $sequence['prefix'];
            $data['outdoc_number'] = $sequence['number'];
            $data['full_outdoc_number'] = $sequence['full_number'];
            $data['manual_outdoc_number'] = null;
        } else {
            $data['full_outdoc_number'] = $data['manual_outdoc_number'];
        }

        // If this document is issued from a template, persist template linkage and generate a basic body_html for display
        // (PDF generation is done on-demand via /dms/outgoing/{id}/pdf, similar to certificates).
        if (!empty($data['template_id']) && empty($data['body_html'])) {
            $template = LetterTemplate::where('organization_id', $profile->organization_id)
                ->with(['letterhead', 'watermark'])
                ->find($data['template_id']);

            if ($template) {
                $documentVars = $this->buildOutgoingDocumentVariablesFromPayload($data);
                $templateVars = is_array($data['template_variables'] ?? null) ? $data['template_variables'] : [];

                $allVars = $this->fieldMappingService->buildVariablesForOutgoingDocument(
                    $data['recipient_type'] ?? 'general',
                    $data['recipient_id'] ?? null,
                    $templateVars,
                    $documentVars
                );

                $processedText = $this->renderingService->replaceTemplateVariables($template->body_text ?? '', $allVars);
                $data['body_html'] = $this->bodyTextToSafeHtml($processedText);

                // Default the outgoing document's letterhead_id to the template's letterhead if not set
                if (empty($data['letterhead_id']) && !empty($template->letterhead_id)) {
                    $data['letterhead_id'] = $template->letterhead_id;
                }
            }
        }

        // Set academic_year_id if not provided, use current academic year
        // Only set if column exists (migration may not have run yet)
        if (empty($data['academic_year_id']) && Schema::hasColumn('outgoing_documents', 'academic_year_id')) {
            $currentAcademicYear = \App\Models\AcademicYear::where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->where('is_current', true)
                ->whereNull('deleted_at')
                ->first();
            if ($currentAcademicYear) {
                $data['academic_year_id'] = $currentAcademicYear->id;
            }
        } elseif (!Schema::hasColumn('outgoing_documents', 'academic_year_id')) {
            // Remove academic_year_id from data if column doesn't exist
            unset($data['academic_year_id']);
        }

        $data['organization_id'] = $profile->organization_id;
        $data['created_by'] = $user->id;

        $doc = OutgoingDocument::create($data);

        return response()->json($doc, 201);
    }

    public function show(string $id, Request $request)
    {
        // Try to get context with read permission first, then try create permission
        $context = $this->requireOrganizationContext($request, 'dms.outgoing.read');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            // If read permission fails, try create permission (for users who can issue letters)
            $context = $this->requireOrganizationContext($request, 'dms.outgoing.create');
            if ($context instanceof \Illuminate\Http\JsonResponse) {
                return $context;
            }
        }
        [$user, $profile, $currentSchoolId] = $context;

        $doc = OutgoingDocument::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->firstOrFail();

        // Check if user has either read OR create permission
        $hasReadPermission = $user->hasPermissionTo('dms.outgoing.read');
        $hasCreatePermission = $user->hasPermissionTo('dms.outgoing.create');
        
        if (!$hasReadPermission && !$hasCreatePermission) {
            return response()->json(['error' => 'You do not have permission to view outgoing documents. You need either "Read Outgoing Documents" or "Create Outgoing Documents" permission.'], 403);
        }

        // Check if user created this document (users can always view documents they created)
        $userCreatedDocument = isset($doc->created_by) && $doc->created_by === $user->id;

        // Check security clearance
        // Skip security clearance check if:
        // 1. User created the document (they should be able to view their own documents)
        // 2. User has create permission (they can issue letters, so they should be able to view them regardless of security level)
        if ($doc->security_level_key && !$userCreatedDocument && !$hasCreatePermission) {
            // Only enforce security clearance for users with ONLY read permission who didn't create the document
            // Users with create permission can view any document (they issued it), bypassing security clearance
            if (!$this->securityGateService->canView($user, $doc->security_level_key, $profile->organization_id)) {
                return response()->json(['error' => 'Insufficient security clearance to view this document'], 403);
            }
        }

        $files = DocumentFile::where('owner_type', 'outgoing')
            ->where('owner_id', $doc->id)
            ->orderByDesc('version')
            ->get();

        return ['document' => $doc, 'files' => $files];
    }

    public function update(string $id, Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.outgoing.update');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [$user, $profile, $currentSchoolId] = $context;

        $doc = OutgoingDocument::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->firstOrFail();

        $this->authorize('update', $doc);

        $data = $request->validate([
            'security_level_key' => ['nullable', 'string'],
            'recipient_type' => ['nullable', 'string'],
            'recipient_id' => ['nullable', 'uuid'],
            'external_recipient_name' => ['nullable', 'string', 'max:255'],
            'external_recipient_org' => ['nullable', 'string', 'max:255'],
            'recipient_address' => ['nullable', 'string', 'max:255'],
            'subject' => ['nullable', 'string', 'max:500'],
            'body_html' => ['nullable', 'string'],
            'template_id' => ['nullable', 'uuid', 'exists:letter_templates,id'],
            'letterhead_id' => ['nullable', 'uuid', 'exists:letterheads,id'],
            'template_variables' => ['nullable', 'array'],
            'issue_date' => ['nullable', 'date'],
            'signed_by_user_id' => ['nullable', 'uuid'],
            'status' => ['nullable', 'string'],
            'announcement_scope' => ['nullable', 'array'],
            'table_payload' => ['nullable', 'array'],
        ]);

        $doc->fill($data);

        // If any fields that affect rendering changed, invalidate the cached PDF.
        if ($doc->isDirty([
            'template_id',
            'template_variables',
            'body_html',
            'table_payload',
            'recipient_type',
            'recipient_id',
            'external_recipient_name',
            'external_recipient_org',
            'recipient_address',
            'subject',
            'issue_date',
        ])) {
            $doc->pdf_path = null;
        }
        $doc->updated_by = $user->id;
        $doc->save();

        return $doc;
    }

    public function downloadPdf(string $id, Request $request)
    {
        // Try to get context with read permission first, then try create permission
        $context = $this->requireOrganizationContext($request, 'dms.outgoing.read');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            // If read permission fails, try create permission (for users who can issue letters)
            $context = $this->requireOrganizationContext($request, 'dms.outgoing.create');
            if ($context instanceof \Illuminate\Http\JsonResponse) {
                return $context;
            }
        }
        [$user, $profile, $currentSchoolId] = $context;

        $doc = OutgoingDocument::with(['template.letterhead', 'template.watermark', 'letterhead'])
            ->where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->firstOrFail();

        // Check if user has either read OR create permission
        $hasReadPermission = $user->hasPermissionTo('dms.outgoing.read');
        $hasCreatePermission = $user->hasPermissionTo('dms.outgoing.create');
        
        if (!$hasReadPermission && !$hasCreatePermission) {
            return response()->json(['error' => 'You do not have permission to download outgoing document PDFs. You need either "Read Outgoing Documents" or "Create Outgoing Documents" permission.'], 403);
        }

        // Check if user created this document (users can always download documents they created)
        $userCreatedDocument = false;
        if (isset($doc->created_by) && $doc->created_by === $user->id) {
            $userCreatedDocument = true;
        }

        // Check security clearance
        // Skip security clearance check if:
        // 1. User created the document (they should be able to download their own documents)
        // 2. User has create permission (they can issue letters, so they should be able to download them regardless of security level)
        if ($doc->security_level_key && !$userCreatedDocument && !$hasCreatePermission) {
            // Only enforce security clearance for users with ONLY read permission who didn't create the document
            // Users with create permission can download any document (they issued it), bypassing security clearance
            if (!$this->securityGateService->canView($user, $doc->security_level_key, $profile->organization_id)) {
                return response()->json(['error' => 'Insufficient security clearance to view this document'], 403);
            }
        }

        $pdfPath = $doc->pdf_path;
        if (!$pdfPath || !Storage::exists($pdfPath)) {
            if (!$doc->template) {
                return response()->json([
                    'error' => 'This outgoing document has no template assigned, so a PDF cannot be generated.',
                ], 422);
            }

            try {
                $template = $doc->template;
                $templateVars = is_array($doc->template_variables) ? $doc->template_variables : [];
                $documentVars = $this->buildOutgoingDocumentVariablesFromModel($doc);

                $allVars = $this->fieldMappingService->buildVariablesForOutgoingDocument(
                    $doc->recipient_type ?? 'general',
                    $doc->recipient_id,
                    $templateVars,
                    $documentVars
                );

                $processedText = $this->renderingService->replaceTemplateVariables($template->body_text ?? '', $allVars);
                
                // Use document's letterhead if set, otherwise use template's letterhead
                // Temporarily override template's letterhead with document's letterhead for rendering
                $originalLetterhead = $template->letterhead;
                if ($doc->letterhead) {
                    $template->setRelation('letterhead', $doc->letterhead);
                }
                
                $html = $this->renderingService->render($template, $processedText, [
                    'table_payload' => $doc->table_payload ?? null,
                    'for_browser' => false,
                ]);
                
                // Restore original letterhead relationship
                $template->setRelation('letterhead', $originalLetterhead);

                $directory = 'dms/outgoing/' . ($doc->school_id ?: $profile->default_school_id ?: $profile->organization_id);
                $pdfPath = $this->pdfService->generate($html, $template->page_layout ?? 'A4_portrait', $directory);

                $doc->pdf_path = $pdfPath;
                if ($doc->status === 'issued') {
                    $doc->status = 'printed';
                }
                $doc->save();
            } catch (\Exception $e) {
                \Log::error('Failed to generate PDF for outgoing document', [
                    'document_id' => $doc->id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                return response()->json([
                    'error' => 'Failed to generate PDF: ' . $e->getMessage(),
                ], 500);
            }
        }

        if (!$pdfPath || !Storage::exists($pdfPath)) {
            \Log::error('PDF path does not exist after generation', [
                'document_id' => $doc->id,
                'pdf_path' => $pdfPath,
            ]);
            return response()->json(['error' => 'Failed to generate outgoing document PDF'], 500);
        }

        try {
            $filename = $this->buildPdfFilename($doc);
            return Storage::download($pdfPath, $filename);
        } catch (\Exception $e) {
            \Log::error('Failed to download PDF file', [
                'document_id' => $doc->id,
                'pdf_path' => $pdfPath,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'error' => 'Failed to download PDF: ' . $e->getMessage(),
            ], 500);
        }
    }

    private function buildOutgoingDocumentVariablesFromPayload(array $data): array
    {
        $issueDate = !empty($data['issue_date']) ? \Illuminate\Support\Carbon::parse($data['issue_date'])->format('Y-m-d') : '';

        return [
            'document_number' => (string) ($data['full_outdoc_number'] ?? ''),
            'document_date' => $issueDate,
            'issue_date' => $issueDate,
            'subject' => (string) ($data['subject'] ?? ''),
            'recipient_name' => (string) ($data['external_recipient_name'] ?? ''),
            'recipient_organization' => (string) ($data['external_recipient_org'] ?? ''),
            'recipient_address' => (string) ($data['recipient_address'] ?? ''),
        ];
    }

    private function buildOutgoingDocumentVariablesFromModel(OutgoingDocument $doc): array
    {
        $issueDate = $doc->issue_date ? $doc->issue_date->format('Y-m-d') : '';

        return [
            'document_number' => (string) ($doc->full_outdoc_number ?? ''),
            'document_date' => $issueDate,
            'issue_date' => $issueDate,
            'subject' => (string) ($doc->subject ?? ''),
            'recipient_name' => (string) ($doc->external_recipient_name ?? ''),
            'recipient_organization' => (string) ($doc->external_recipient_org ?? ''),
            'recipient_address' => (string) ($doc->recipient_address ?? ''),
        ];
    }

    private function bodyTextToSafeHtml(string $text): string
    {
        $blocks = preg_split('/\n\s*\n/', trim($text)) ?: [];
        if (empty($blocks) && trim($text) !== '') {
            $blocks = [$text];
        }

        $paragraphs = [];
        foreach ($blocks as $block) {
            $block = trim((string) $block);
            if ($block === '') {
                continue;
            }
            $paragraphs[] = '<p style="margin:0 0 12px 0; white-space:pre-wrap;">' . nl2br(e($block)) . '</p>';
        }

        $content = implode("\n", $paragraphs);
        return '<div dir="rtl" style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.8;">' . $content . '</div>';
    }

    private function buildPdfFilename(OutgoingDocument $doc): string
    {
        $base = $doc->full_outdoc_number ?: 'outgoing-document';
        $base = preg_replace('/[^A-Za-z0-9._-]+/', '_', (string) $base) ?: 'outgoing-document';
        $base = Str::limit($base, 80, '');
        $base = trim($base, '_');

        return $base . '.pdf';
    }

}
