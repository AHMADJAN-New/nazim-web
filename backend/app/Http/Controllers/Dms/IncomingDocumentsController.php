<?php

namespace App\Http\Controllers\Dms;

use App\Models\IncomingDocument;
use App\Models\DocumentFile;
use App\Models\DocumentSetting;
use App\Services\DocumentNumberingService;
use App\Services\SecurityGateService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class IncomingDocumentsController extends BaseDmsController
{
    public function __construct(
        private DocumentNumberingService $numberingService,
        private SecurityGateService $securityGateService
    ) {
    }

    public function index(Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.incoming.read');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        $this->authorize('viewAny', IncomingDocument::class);
        [$user, $profile, $schoolIds] = $context;

        $query = IncomingDocument::query()
            ->with(['routingDepartment', 'academicYear'])
            ->where('organization_id', $profile->organization_id);

        if (!empty($schoolIds)) {
            $query->where(function ($q) use ($schoolIds) {
                $q->whereIn('school_id', $schoolIds)->orWhereNull('school_id');
            });
        }

        // Filters
        if ($request->filled('subject')) {
            $query->where('subject', 'ilike', '%' . $request->subject . '%');
        }
        if ($request->filled('sender_org')) {
            $query->where('sender_org', 'ilike', '%' . $request->sender_org . '%');
        }
        if ($request->filled('security_level_key')) {
            $query->where('security_level_key', $request->security_level_key);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('routing_department_id')) {
            $query->where('routing_department_id', $request->routing_department_id);
        }
        if ($request->filled('indoc_number')) {
            $query->where(function ($q) use ($request) {
                $q->where('indoc_number', $request->indoc_number)
                    ->orWhere('full_indoc_number', 'ilike', '%' . $request->indoc_number . '%');
            });
        }
        if ($request->filled('from_date')) {
            $query->whereDate('received_date', '>=', $request->from_date);
        }
        if ($request->filled('to_date')) {
            $query->whereDate('received_date', '<=', $request->to_date);
        }

        // Enforce clearance
        $query->where(function ($q) use ($user, $profile) {
            $q->whereNull('security_level_key')
                ->orWhereExists(function ($sub) use ($user, $profile) {
                    $sub->select(DB::raw(1))
                        ->from('security_levels')
                        ->whereColumn('security_levels.key', 'incoming_documents.security_level_key')
                        ->where('security_levels.organization_id', $profile->organization_id)
                        ->whereRaw('? >= security_levels.rank', [$this->userClearanceRank($user, $profile->organization_id)]);
                });
        });

        $query->orderByDesc('received_date')->orderByDesc('created_at');

        if ($request->boolean('paginate', true)) {
            $perPage = min(100, $request->integer('per_page', 20));
            return $query->paginate($perPage);
        }

        return $query->limit(200)->get();
    }

    public function store(Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.incoming.create');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        $this->authorize('create', IncomingDocument::class);
        [$user, $profile, $schoolIds] = $context;

        $validationRules = [
            'security_level_key' => ['nullable', 'string'],
            'indoc_prefix' => ['nullable', 'string'],
            'external_doc_number' => ['nullable', 'string'],
            'external_doc_date' => ['nullable', 'date'],
            'sender_name' => ['nullable', 'string', 'max:255'],
            'sender_org' => ['nullable', 'string', 'max:255'],
            'sender_address' => ['nullable', 'string', 'max:255'],
            'subject' => ['nullable', 'string', 'max:500'],
            'description' => ['nullable', 'string'],
            'pages_count' => ['nullable', 'integer', 'min:0'],
            'attachments_count' => ['nullable', 'integer', 'min:0'],
            'received_date' => ['required', 'date'],
            'routing_department_id' => ['nullable', 'uuid'],
            'assigned_to_user_id' => ['nullable', 'uuid'],
            'status' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'is_manual_number' => ['boolean'],
            'manual_indoc_number' => ['nullable', 'string'],
            'school_id' => ['nullable', 'uuid'],
        ];

        // Only validate academic_year_id if column exists
        if (\Schema::hasColumn('incoming_documents', 'academic_year_id')) {
            $validationRules['academic_year_id'] = ['nullable', 'uuid', 'exists:academic_years,id'];
        }

        $data = $request->validate($validationRules);

        if ($response = $this->ensureSchoolAccess($data['school_id'] ?? null, $schoolIds)) {
            return $response;
        }

        if (!$request->boolean('is_manual_number')) {
            $settings = DocumentSetting::firstOrCreate(
                ['organization_id' => $profile->organization_id, 'school_id' => $data['school_id'] ?? null],
                []
            );
            
            // Get academic year if provided and column exists
            $academicYear = null;
            if (!empty($data['academic_year_id']) && \Schema::hasColumn('incoming_documents', 'academic_year_id')) {
                $academicYear = \App\Models\AcademicYear::where('id', $data['academic_year_id'])
                    ->where('organization_id', $profile->organization_id)
                    ->first();
            }
            
            $yearKey = $this->numberingService->getYearKey(
                $settings->year_mode ?? 'gregorian',
                $academicYear
            );
            $sequence = $this->numberingService->generateIncomingNumber(
                $profile->organization_id,
                $data['school_id'] ?? null,
                $settings->incoming_prefix ?? 'IN',
                $yearKey
            );
            $data['indoc_prefix'] = $sequence['prefix'];
            $data['indoc_number'] = $sequence['number'];
            $data['full_indoc_number'] = $sequence['full_number'];
            $data['manual_indoc_number'] = null;
        } else {
            $data['full_indoc_number'] = $data['manual_indoc_number'];
        }
        
        // Set academic_year_id if not provided, use current academic year
        // Only set if column exists (migration may not have run yet)
        if (empty($data['academic_year_id']) && \Schema::hasColumn('incoming_documents', 'academic_year_id')) {
            $currentAcademicYear = \App\Models\AcademicYear::where('organization_id', $profile->organization_id)
                ->where('is_current', true)
                ->whereNull('deleted_at')
                ->first();
            if ($currentAcademicYear) {
                $data['academic_year_id'] = $currentAcademicYear->id;
            }
        } elseif (!\Schema::hasColumn('incoming_documents', 'academic_year_id')) {
            // Remove academic_year_id from data if column doesn't exist
            unset($data['academic_year_id']);
        }

        $data['organization_id'] = $profile->organization_id;
        $data['created_by'] = $user->id;

        $doc = IncomingDocument::create($data);

        return response()->json($doc, 201);
    }

    public function show(string $id, Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.incoming.read');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [$user, $profile, $schoolIds] = $context;

        $doc = IncomingDocument::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->firstOrFail();

        if ($response = $this->ensureSchoolAccess($doc->school_id, $schoolIds)) {
            return $response;
        }

        $this->authorize('view', $doc);

        if ($doc->security_level_key && !$this->securityGateService->canView($user, $doc->security_level_key, $profile->organization_id)) {
            return response()->json(['error' => 'Insufficient clearance'], 403);
        }

        $files = DocumentFile::where('owner_type', 'incoming')
            ->where('owner_id', $doc->id)
            ->orderByDesc('version')
            ->get();

        return ['document' => $doc, 'files' => $files];
    }

    public function update(string $id, Request $request)
    {
        $context = $this->requireOrganizationContext($request, 'dms.incoming.update');
        if ($context instanceof \Illuminate\Http\JsonResponse) {
            return $context;
        }
        [$user, $profile, $schoolIds] = $context;

        $doc = IncomingDocument::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->firstOrFail();

        if ($response = $this->ensureSchoolAccess($doc->school_id, $schoolIds)) {
            return $response;
        }

        $this->authorize('update', $doc);

        $data = $request->validate([
            'security_level_key' => ['nullable', 'string'],
            'sender_name' => ['nullable', 'string', 'max:255'],
            'sender_org' => ['nullable', 'string', 'max:255'],
            'sender_address' => ['nullable', 'string', 'max:255'],
            'subject' => ['nullable', 'string', 'max:500'],
            'received_date' => ['nullable', 'date'],
            'routing_department_id' => ['nullable', 'uuid'],
            'assigned_to_user_id' => ['nullable', 'uuid'],
            'status' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);

        if ($response = $this->ensureSchoolAccess($doc->school_id, $schoolIds)) {
            return $response;
        }

        $doc->fill($data);
        $doc->updated_by = $user->id;
        $doc->save();

        return $doc;
    }

}
