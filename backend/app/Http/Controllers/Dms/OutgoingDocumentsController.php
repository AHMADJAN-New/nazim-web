<?php

namespace App\Http\Controllers\Dms;

use App\Models\OutgoingDocument;
use App\Models\DocumentFile;
use App\Models\DocumentSetting;
use App\Services\DocumentPdfService;
use App\Services\DocumentNumberingService;
use App\Services\DocumentRenderingService;
use App\Services\SecurityGateService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OutgoingDocumentsController extends BaseDmsController
{
    public function __construct(
        private DocumentNumberingService $numberingService,
        private SecurityGateService $securityGateService,
        private DocumentRenderingService $renderingService,
        private DocumentPdfService $pdfService
    ) {
    }

    public function index(Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.outgoing.read');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        $this->authorize('viewAny', OutgoingDocument::class);
        [$user, $profile, $schoolIds] = $context;

        $query = OutgoingDocument::query()
            ->where('organization_id', $profile->organization_id);

        if (!empty($schoolIds)) {
            $query->where(function ($q) use ($schoolIds) {
                $q->whereIn('school_id', $schoolIds)->orWhereNull('school_id');
            });
        }

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
        [$user, $profile, $schoolIds] = $context;

        $data = $request->validate([
            'security_level_key' => ['nullable', 'string'],
            'recipient_type' => ['required', 'string'],
            'recipient_id' => ['nullable', 'uuid'],
            'external_recipient_name' => ['nullable', 'string', 'max:255'],
            'external_recipient_org' => ['nullable', 'string', 'max:255'],
            'recipient_address' => ['nullable', 'string', 'max:255'],
            'subject' => ['required', 'string', 'max:500'],
            'body_html' => ['nullable', 'string'],
            'issue_date' => ['required', 'date'],
            'signed_by_user_id' => ['nullable', 'uuid'],
            'status' => ['nullable', 'string'],
            'announcement_scope' => ['nullable', 'array'],
            'table_payload' => ['nullable', 'array'],
            'is_manual_number' => ['boolean'],
            'manual_outdoc_number' => ['nullable', 'string'],
            'school_id' => ['nullable', 'uuid'],
        ]);

        if ($response = $this->ensureSchoolAccess($data['school_id'] ?? null, $schoolIds)) {
            return $response;
        }

        if (!$request->boolean('is_manual_number')) {
            $settings = DocumentSetting::firstOrCreate(
                ['organization_id' => $profile->organization_id, 'school_id' => $data['school_id'] ?? null],
                []
            );
            $yearKey = $this->numberingService->getYearKey($settings->year_mode ?? 'gregorian');
            $sequence = $this->numberingService->generateOutgoingNumber(
                $profile->organization_id,
                $data['school_id'] ?? null,
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

        $data['organization_id'] = $profile->organization_id;
        $data['created_by'] = $user->id;

        $doc = OutgoingDocument::create($data);

        return response()->json($doc, 201);
    }

    public function show(string $id, Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.outgoing.read');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [$user, $profile, $schoolIds] = $context;

        $doc = OutgoingDocument::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->firstOrFail();

        $this->authorize('view', $doc);

        if ($response = $this->ensureSchoolAccess($doc->school_id, $schoolIds)) {
            return $response;
        }

        if ($doc->security_level_key && !$this->securityGateService->canView($user, $doc->security_level_key, $profile->organization_id)) {
            return response()->json(['error' => 'Insufficient clearance'], 403);
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
        [$user, $profile, $schoolIds] = $context;

        $doc = OutgoingDocument::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->firstOrFail();

        $this->authorize('update', $doc);

        if ($response = $this->ensureSchoolAccess($doc->school_id, $schoolIds)) {
            return $response;
        }

        $data = $request->validate([
            'security_level_key' => ['nullable', 'string'],
            'recipient_type' => ['nullable', 'string'],
            'recipient_id' => ['nullable', 'uuid'],
            'external_recipient_name' => ['nullable', 'string', 'max:255'],
            'external_recipient_org' => ['nullable', 'string', 'max:255'],
            'recipient_address' => ['nullable', 'string', 'max:255'],
            'subject' => ['nullable', 'string', 'max:500'],
            'body_html' => ['nullable', 'string'],
            'issue_date' => ['nullable', 'date'],
            'signed_by_user_id' => ['nullable', 'uuid'],
            'status' => ['nullable', 'string'],
            'announcement_scope' => ['nullable', 'array'],
            'table_payload' => ['nullable', 'array'],
        ]);

        if ($response = $this->ensureSchoolAccess($data['school_id'] ?? $doc->school_id, $schoolIds)) {
            return $response;
        }

        $doc->fill($data);
        $doc->updated_by = $user->id;
        $doc->save();

        return $doc;
    }

    public function generatePdf(string $id, Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.outgoing.update');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [$user, $profile, $schoolIds] = $context;

        $doc = OutgoingDocument::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->firstOrFail();

        $this->authorize('update', $doc);

        if ($response = $this->ensureSchoolAccess($doc->school_id, $schoolIds)) {
            return $response;
        }

        $html = $this->renderingService->render($doc->body_html ?? '', [
            'page_layout' => $doc->page_layout ?? 'A4_portrait',
            'table_payload' => $doc->table_payload ?? null,
        ]);

        $pdfPath = $this->pdfService->generate($html, $doc->page_layout ?? 'A4_portrait');

        $latestVersion = DocumentFile::where('owner_type', 'outgoing')
            ->where('owner_id', $doc->id)
            ->max('version') ?? 0;

        $file = DocumentFile::create([
            'organization_id' => $profile->organization_id,
            'school_id' => $doc->school_id,
            'owner_type' => 'outgoing',
            'owner_id' => $doc->id,
            'file_type' => 'generated_pdf',
            'original_name' => $doc->subject ? $doc->subject . '.pdf' : 'document.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => null,
            'storage_path' => $pdfPath,
            'version' => $latestVersion + 1,
            'uploaded_by_user_id' => $user->id,
        ]);

        $doc->pdf_path = $pdfPath;
        $doc->save();

        return response()->json(['file' => $file, 'pdf_path' => $pdfPath]);
    }

}
