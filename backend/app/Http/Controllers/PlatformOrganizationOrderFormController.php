<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\OrganizationOrderForm;
use App\Models\OrganizationOrderFormDocument;
use App\Models\OrganizationSubscription;
use App\Models\SubscriptionPlan;
use App\Services\OrganizationOrderFormPdfService;
use App\Services\Reports\DateConversionService;
use App\Services\Storage\FileStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class PlatformOrganizationOrderFormController extends Controller
{
    private const STATUS_VALUES = ['draft', 'pending_review', 'sent', 'signed'];
    private const BILLING_CYCLES = ['monthly', 'quarterly', 'yearly', 'custom'];
    private const TRAINING_MODES = ['in_person', 'online', 'hybrid'];
    private const DOCUMENT_CATEGORIES = [
        'signed_order_form',
        'contract',
        'signed_contract',
        'order_form_template',
        'identity_document',
        'payment_receipt',
        'supporting_document',
        'other',
    ];

    private const PROVIDER_DEFAULTS = [
        'provider_organization_name' => 'Atif Zada ICT Services',
        'provider_address' => 'ششدرک، کابل، افغانستان',
        'provider_contact_name' => 'Nazim Platform Team',
        'provider_contact_title' => 'Sales & Partnership',
        'provider_email' => 'support@nazim.cloud',
        'provider_phone' => '0787779988',
        'provider_website' => 'https://nazim.cloud',
        'provider_notes' => null,
    ];

    public function __construct(
        private FileStorageService $fileStorageService,
        private OrganizationOrderFormPdfService $pdfService,
        private DateConversionService $dateService
    ) {
    }

    public function show(Request $request, string $organizationId)
    {
        $organization = Organization::findOrFail($organizationId);
        $subscription = $this->getCurrentSubscription($organizationId);
        $orderForm = OrganizationOrderForm::with(['plan', 'documents.uploadedByUser'])
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->first();

        $serialized = $this->serializeOrderForm($orderForm, $organization, $subscription);
        $subscriptionContext = $this->buildSubscriptionContext($subscription);
        $fromSubscription = $subscription ? $this->buildDefaults($organization, $subscription) : null;

        $payload = [
            'order_form' => $serialized,
            'documents' => $this->serializeDocuments($orderForm?->documents ?? collect()),
            'subscription_context' => $subscriptionContext,
            'from_subscription' => $fromSubscription,
        ];

        return response()->json(['data' => $payload]);
    }

    public function upsert(Request $request, string $organizationId)
    {
        $organization = Organization::findOrFail($organizationId);
        $subscription = $this->getCurrentSubscription($organizationId);
        $validator = Validator::make($request->all(), $this->rules());

        if ($validator->fails()) {
            return response()->json([
                'error' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        if (!empty($validated['plan_id'])) {
            $plan = SubscriptionPlan::find($validated['plan_id']);
            if ($plan && empty($validated['plan_name_override'])) {
                $validated['plan_name_override'] = $plan->name;
            }
            if ($plan && empty($validated['plan_description'])) {
                $validated['plan_description'] = $plan->description;
            }
        }

        [$discountAmount, $totalAmount] = $this->calculateFinancials($validated);

        $orderForm = null;

        DB::transaction(function () use (&$orderForm, $organizationId, $organization, $subscription, $validated, $discountAmount, $totalAmount, $request) {
            $orderForm = OrganizationOrderForm::firstOrNew([
                'organization_id' => $organizationId,
            ]);

            if (!$orderForm->exists) {
                $orderForm->fill($this->buildDefaults($organization, $subscription));
                $orderForm->created_by = (string) $request->user()->id;
                $orderForm->form_number = $validated['form_number'] ?? $this->generateFormNumber($organization->slug ?? null);
            }

            $orderForm->fill($validated);
            $orderForm->subscription_id = $subscription?->id;
            $orderForm->discount_amount = $discountAmount;
            $orderForm->total_amount = $totalAmount;
            $orderForm->updated_by = (string) $request->user()->id;
            $orderForm->save();
        });

        $fresh = OrganizationOrderForm::with(['plan', 'documents.uploadedByUser'])
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->first();

        return response()->json([
            'data' => [
                'order_form' => $this->serializeOrderForm($fresh, $organization, $subscription),
                'documents' => $this->serializeDocuments($fresh?->documents ?? collect()),
            ],
            'message' => 'Order form saved successfully',
        ]);
    }

    public function downloadPdf(Request $request, string $organizationId)
    {
        $organization = Organization::findOrFail($organizationId);
        $subscription = $this->getCurrentSubscription($organizationId);
        $orderForm = OrganizationOrderForm::with(['plan', 'documents'])
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->first();

        $documents = $orderForm?->documents ?? collect();
        $serializedOrderForm = $this->serializeOrderForm($orderForm, $organization, $subscription);
        $serializedDocuments = $this->serializeDocuments($documents);
        $nazimLogoDataUri = $this->getNazimLogoDataUri();
        $subscriptionContext = $this->buildSubscriptionContext($subscription);

        $calendarPreference = $request->query('calendar_preference', 'jalali');
        $language = $request->query('language', 'ps');
        $formatDateFn = fn ($date, $format = 'full') => $date
            ? $this->dateService->formatDate($date, $calendarPreference, $format, $language)
            : '—';

        $pdfPath = $this->pdfService->generate([
            'organization' => $organization,
            'orderForm' => $serializedOrderForm,
            'documents' => $serializedDocuments,
            'nazimLogoDataUri' => $nazimLogoDataUri,
            'subscription_context' => $subscriptionContext,
            'formatDate' => $formatDateFn,
            'calendar_preference' => $calendarPreference,
            'language' => $language,
        ], ($serializedOrderForm['form_number'] ?? 'nazim-order-form') . '-' . ($organization->slug ?? 'organization'));

        return response()->download(
            $pdfPath,
            ($serializedOrderForm['form_number'] ?? 'nazim-order-form') . '.pdf',
            ['Content-Type' => 'application/pdf']
        )->deleteFileAfterSend(true);
    }

    /**
     * Download PDF using the current form data from the request body.
     * Use this when the frontend wants the PDF to reflect unsaved form values.
     */
    public function downloadPdfWithData(Request $request, string $organizationId)
    {
        $organization = Organization::findOrFail($organizationId);
        $subscription = $this->getCurrentSubscription($organizationId);
        $orderForm = OrganizationOrderForm::with(['plan', 'documents'])
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->first();

        $documents = $orderForm?->documents ?? collect();
        $serializedOrderForm = $this->serializeOrderForm($orderForm, $organization, $subscription);

        $body = $request->all();
        if (!empty($body['order_form'])) {
            $overrides = $body['order_form'];
            $validated = array_intersect_key($overrides, array_flip([
                'license_fee', 'additional_services_fee', 'tax_amount', 'discount_amount',
                'discount_percentage', 'discount_name', 'maintenance_fee', 'currency',
                'form_number', 'issue_date', 'subscription_start_date', 'subscription_end_date',
                'implementation_date', 'customer_signed_at', 'provider_signed_at',
                'customer_organization_name', 'customer_address', 'customer_contact_name',
                'customer_contact_title', 'customer_email', 'customer_phone', 'customer_whatsapp',
                'provider_organization_name', 'provider_address', 'provider_contact_name',
                'provider_contact_title', 'provider_email', 'provider_phone', 'provider_website',
                'plan_name_override', 'plan_description', 'billing_cycle', 'payment_terms',
                'payment_notes', 'max_students', 'max_staff', 'max_system_users', 'max_storage_gb',
                'status', 'customer_signatory_name', 'customer_signatory_title',
                'provider_signatory_name', 'provider_signatory_title',
            ]));
            foreach ($validated as $key => $value) {
                if ($value !== null) {
                    $serializedOrderForm[$key] = $value;
                }
            }
        }

        $serializedDocuments = $this->serializeDocuments($documents);
        $nazimLogoDataUri = $this->getNazimLogoDataUri();
        $subscriptionContext = $this->buildSubscriptionContext($subscription);

        $calendarPreference = $body['calendar_preference'] ?? $request->query('calendar_preference', 'jalali');
        $language = $body['language'] ?? $request->query('language', 'ps');
        $formatDateFn = fn ($date, $format = 'full') => $date
            ? $this->dateService->formatDate($date, $calendarPreference, $format, $language)
            : '—';

        $pdfPath = $this->pdfService->generate([
            'organization' => $organization,
            'orderForm' => $serializedOrderForm,
            'documents' => $serializedDocuments,
            'nazimLogoDataUri' => $nazimLogoDataUri,
            'subscription_context' => $subscriptionContext,
            'formatDate' => $formatDateFn,
            'calendar_preference' => $calendarPreference,
            'language' => $language,
        ], ($serializedOrderForm['form_number'] ?? 'nazim-order-form') . '-' . ($organization->slug ?? 'organization'));

        return response()->download(
            $pdfPath,
            ($serializedOrderForm['form_number'] ?? 'nazim-order-form') . '.pdf',
            ['Content-Type' => 'application/pdf']
        )->deleteFileAfterSend(true);
    }

    public function uploadDocument(Request $request, string $organizationId)
    {
        $organization = Organization::findOrFail($organizationId);
        $subscription = $this->getCurrentSubscription($organizationId);
        $validator = Validator::make($request->all(), [
            'document_category' => 'required|string|in:' . implode(',', self::DOCUMENT_CATEGORIES),
            'title' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'file' => 'required|file|max:25600',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();
        $orderForm = $this->getOrCreateOrderForm($organization, $subscription, (string) $request->user()->id);

        $file = $request->file('file');
        $path = $this->fileStorageService->storeOrganizationOrderFormDocument(
            $file,
            $organizationId,
            $orderForm->id,
            $validated['document_category']
        );

        $document = OrganizationOrderFormDocument::create([
            'organization_order_form_id' => $orderForm->id,
            'organization_id' => $organizationId,
            'document_category' => $validated['document_category'],
            'title' => $validated['title'] ?: $file->getClientOriginalName(),
            'notes' => $validated['notes'] ?? null,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'uploaded_by' => (string) $request->user()->id,
        ]);

        $document->loadMissing('uploadedByUser');

        return response()->json([
            'data' => $this->serializeDocument($document),
            'message' => 'Document uploaded successfully',
        ], 201);
    }

    public function downloadDocument(Request $request, string $organizationId, string $documentId)
    {
        Organization::findOrFail($organizationId);

        $document = OrganizationOrderFormDocument::where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->findOrFail($documentId);

        return $this->fileStorageService->downloadFile($document->file_path, $document->file_name);
    }

    public function destroyDocument(Request $request, string $organizationId, string $documentId)
    {
        Organization::findOrFail($organizationId);

        $document = OrganizationOrderFormDocument::where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->findOrFail($documentId);

        $path = $document->file_path;
        $document->delete();
        $this->fileStorageService->deleteFile($path);

        return response()->json([
            'message' => 'Document deleted successfully',
        ]);
    }

    private function getCurrentSubscription(string $organizationId): ?OrganizationSubscription
    {
        return OrganizationSubscription::with(['plan.limits', 'licensePayment'])
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->latest('created_at')
            ->first();
    }

    private function getOrCreateOrderForm(Organization $organization, ?OrganizationSubscription $subscription, string $userId): OrganizationOrderForm
    {
        $existing = OrganizationOrderForm::where('organization_id', $organization->id)
            ->whereNull('deleted_at')
            ->first();

        if ($existing) {
            return $existing;
        }

        $defaults = $this->buildDefaults($organization, $subscription);

        return OrganizationOrderForm::create(array_merge($defaults, [
            'organization_id' => $organization->id,
            'subscription_id' => $subscription?->id,
            'created_by' => $userId,
            'updated_by' => $userId,
        ]));
    }

    private function rules(): array
    {
        return [
            'subscription_id' => 'nullable|uuid|exists:organization_subscriptions,id',
            'plan_id' => 'nullable|uuid|exists:subscription_plans,id',
            'status' => 'nullable|string|in:' . implode(',', self::STATUS_VALUES),
            'form_number' => 'nullable|string|max:80',
            'issue_date' => 'nullable|date',
            'currency' => 'nullable|string|in:AFN,USD',
            'customer_organization_name' => 'nullable|string|max:255',
            'customer_address' => 'nullable|string',
            'customer_contact_name' => 'nullable|string|max:255',
            'customer_contact_title' => 'nullable|string|max:255',
            'customer_email' => 'nullable|email|max:255',
            'customer_phone' => 'nullable|string|max:50',
            'customer_whatsapp' => 'nullable|string|max:50',
            'customer_notes' => 'nullable|string',
            'provider_organization_name' => 'nullable|string|max:255',
            'provider_address' => 'nullable|string',
            'provider_contact_name' => 'nullable|string|max:255',
            'provider_contact_title' => 'nullable|string|max:255',
            'provider_email' => 'nullable|email|max:255',
            'provider_phone' => 'nullable|string|max:50',
            'provider_website' => 'nullable|url|max:255',
            'provider_notes' => 'nullable|string',
            'plan_name_override' => 'nullable|string|max:255',
            'plan_description' => 'nullable|string',
            'billing_cycle' => 'nullable|string|in:' . implode(',', self::BILLING_CYCLES),
            'subscription_start_date' => 'nullable|date',
            'subscription_end_date' => 'nullable|date',
            'license_fee' => 'nullable|numeric|min:0',
            'maintenance_fee' => 'nullable|numeric|min:0',
            'additional_services_fee' => 'nullable|numeric|min:0',
            'tax_amount' => 'nullable|numeric|min:0',
            'discount_name' => 'nullable|string|max:255',
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
            'discount_amount' => 'nullable|numeric|min:0',
            'payment_terms' => 'nullable|string',
            'payment_notes' => 'nullable|string',
            'max_students' => 'nullable|integer|min:0',
            'max_staff' => 'nullable|integer|min:0',
            'max_system_users' => 'nullable|integer|min:0',
            'max_storage_gb' => 'nullable|numeric|min:0',
            'limits_notes' => 'nullable|string',
            'implementation_date' => 'nullable|date',
            'training_mode' => 'nullable|string|in:' . implode(',', self::TRAINING_MODES),
            'special_requirements' => 'nullable|string',
            'additional_modules' => 'nullable|string',
            'important_terms' => 'nullable|string',
            'acceptance_notes' => 'nullable|string',
            'acceptance_confirmed' => 'nullable|boolean',
            'customer_signatory_name' => 'nullable|string|max:255',
            'customer_signatory_title' => 'nullable|string|max:255',
            'customer_signed_at' => 'nullable|date',
            'provider_signatory_name' => 'nullable|string|max:255',
            'provider_signatory_title' => 'nullable|string|max:255',
            'provider_signed_at' => 'nullable|date',
            'internal_notes' => 'nullable|string',
        ];
    }

    /**
     * Calculate financials for order form.
     * Total = license + additional services + tax - discount (maintenance is yearly recurring, NOT in total).
     */
    private function calculateFinancials(array $validated): array
    {
        $licenseFee = (float) ($validated['license_fee'] ?? 0);
        $maintenanceFee = (float) ($validated['maintenance_fee'] ?? 0);
        $additionalServicesFee = (float) ($validated['additional_services_fee'] ?? 0);
        $taxAmount = (float) ($validated['tax_amount'] ?? 0);

        $subtotalForDiscount = $licenseFee + $additionalServicesFee + $taxAmount;

        $discountAmount = (float) ($validated['discount_amount'] ?? 0);
        if ($discountAmount <= 0 && isset($validated['discount_percentage']) && $validated['discount_percentage'] !== null) {
            $discountAmount = round($subtotalForDiscount * ((float) $validated['discount_percentage'] / 100), 2);
        }

        $totalAmount = max($subtotalForDiscount - $discountAmount, 0);

        return [$discountAmount, $totalAmount];
    }

    private function serializeOrderForm(?OrganizationOrderForm $orderForm, Organization $organization, ?OrganizationSubscription $subscription): array
    {
        $defaults = $this->buildDefaults($organization, $subscription);

        if (!$orderForm) {
            return array_merge($defaults, [
                'id' => null,
                'created_at' => null,
                'updated_at' => null,
            ]);
        }

        return array_replace($defaults, [
            'id' => $orderForm->id,
            'organization_id' => $orderForm->organization_id,
            'subscription_id' => $orderForm->subscription_id,
            'plan_id' => $orderForm->plan_id,
            'status' => $orderForm->status,
            'form_number' => $orderForm->form_number,
            'issue_date' => $orderForm->issue_date?->toDateString(),
            'currency' => $orderForm->currency,
            'customer_organization_name' => $orderForm->customer_organization_name,
            'customer_address' => $orderForm->customer_address,
            'customer_contact_name' => $orderForm->customer_contact_name,
            'customer_contact_title' => $orderForm->customer_contact_title,
            'customer_email' => $orderForm->customer_email,
            'customer_phone' => $orderForm->customer_phone,
            'customer_whatsapp' => $orderForm->customer_whatsapp,
            'customer_notes' => $orderForm->customer_notes,
            'provider_organization_name' => $orderForm->provider_organization_name,
            'provider_address' => $orderForm->provider_address,
            'provider_contact_name' => $orderForm->provider_contact_name,
            'provider_contact_title' => $orderForm->provider_contact_title,
            'provider_email' => $orderForm->provider_email,
            'provider_phone' => $orderForm->provider_phone,
            'provider_website' => $orderForm->provider_website,
            'provider_notes' => $orderForm->provider_notes,
            'plan_name_override' => $orderForm->plan_name_override,
            'plan_description' => $orderForm->plan_description,
            'billing_cycle' => $orderForm->billing_cycle,
            'subscription_start_date' => $orderForm->subscription_start_date?->toDateString(),
            'subscription_end_date' => $orderForm->subscription_end_date?->toDateString(),
            'license_fee' => $orderForm->license_fee !== null ? (float) $orderForm->license_fee : 0,
            'maintenance_fee' => $orderForm->maintenance_fee !== null ? (float) $orderForm->maintenance_fee : 0,
            'additional_services_fee' => $orderForm->additional_services_fee !== null ? (float) $orderForm->additional_services_fee : 0,
            'tax_amount' => $orderForm->tax_amount !== null ? (float) $orderForm->tax_amount : 0,
            'discount_name' => $orderForm->discount_name,
            'discount_percentage' => $orderForm->discount_percentage !== null ? (float) $orderForm->discount_percentage : null,
            'discount_amount' => $orderForm->discount_amount !== null ? (float) $orderForm->discount_amount : 0,
            'total_amount' => $orderForm->total_amount !== null ? (float) $orderForm->total_amount : 0,
            'payment_terms' => $orderForm->payment_terms,
            'payment_notes' => $orderForm->payment_notes,
            'max_students' => $orderForm->max_students,
            'max_staff' => $orderForm->max_staff,
            'max_system_users' => $orderForm->max_system_users,
            'max_storage_gb' => $orderForm->max_storage_gb !== null ? (float) $orderForm->max_storage_gb : null,
            'limits_notes' => $orderForm->limits_notes,
            'implementation_date' => $orderForm->implementation_date?->toDateString(),
            'training_mode' => $orderForm->training_mode,
            'special_requirements' => $orderForm->special_requirements,
            'additional_modules' => $orderForm->additional_modules,
            'important_terms' => $orderForm->important_terms,
            'acceptance_notes' => $orderForm->acceptance_notes,
            'acceptance_confirmed' => (bool) $orderForm->acceptance_confirmed,
            'customer_signatory_name' => $orderForm->customer_signatory_name,
            'customer_signatory_title' => $orderForm->customer_signatory_title,
            'customer_signed_at' => $orderForm->customer_signed_at?->toDateString(),
            'provider_signatory_name' => $orderForm->provider_signatory_name,
            'provider_signatory_title' => $orderForm->provider_signatory_title,
            'provider_signed_at' => $orderForm->provider_signed_at?->toDateString(),
            'internal_notes' => $orderForm->internal_notes,
            'created_at' => $orderForm->created_at?->toIso8601String(),
            'updated_at' => $orderForm->updated_at?->toIso8601String(),
        ]);
    }

    private function serializeDocuments($documents): array
    {
        return $documents->map(fn (OrganizationOrderFormDocument $document) => $this->serializeDocument($document))->values()->all();
    }

    private function serializeDocument(OrganizationOrderFormDocument $document): array
    {
        return [
            'id' => $document->id,
            'document_category' => $document->document_category,
            'title' => $document->title,
            'notes' => $document->notes,
            'file_name' => $document->file_name,
            'mime_type' => $document->mime_type,
            'file_size' => $document->file_size,
            'uploaded_by' => $document->uploaded_by,
            'uploaded_by_name' => $document->uploadedByUser?->email,
            'created_at' => $document->created_at?->toIso8601String(),
        ];
    }

    private function buildDefaults(Organization $organization, ?OrganizationSubscription $subscription): array
    {
        $plan = $subscription?->plan;
        $currency = $subscription?->currency ?? 'AFN';
        $organizationAddress = collect([
            $organization->street_address ?? null,
            $organization->city ?? null,
            $organization->state_province ?? null,
            $organization->country ?? null,
        ])->filter()->implode('، ');

        $licenseFee = $plan
            ? (float) ($currency === 'USD' ? ($plan->license_fee_usd ?? 0) : ($plan->license_fee_afn ?? 0))
            : 0;
        $maintenanceFee = $plan
            ? (float) ($currency === 'USD' ? ($plan->maintenance_fee_usd ?? 0) : ($plan->maintenance_fee_afn ?? 0))
            : 0;
        $totalAmount = $licenseFee;

        $limits = [];
        if ($plan && $plan->relationLoaded('limits')) {
            foreach ($plan->limits as $limit) {
                $limits[$limit->resource_key] = $limit->limit_value;
            }
        }

        $getLimit = function (array $keys) use ($limits): ?int {
            foreach ($keys as $key) {
                if (isset($limits[$key]) && $limits[$key] >= 0) {
                    return (int) $limits[$key];
                }
            }
            return null;
        };

        return array_merge([
            'organization_id' => $organization->id,
            'subscription_id' => $subscription?->id,
            'plan_id' => $plan?->id,
            'status' => 'draft',
            'form_number' => $this->generateFormNumber($organization->slug ?? null),
            'issue_date' => now()->toDateString(),
            'currency' => $currency,
            'customer_organization_name' => $organization->name,
            'customer_address' => $organizationAddress,
            'customer_contact_name' => $organization->contact_person_name,
            'customer_contact_title' => $organization->contact_person_position,
            'customer_email' => $organization->contact_person_email ?: $organization->email,
            'customer_phone' => $organization->contact_person_phone ?: $organization->phone,
            'customer_whatsapp' => $organization->contact_person_phone ?: $organization->phone,
            'customer_notes' => null,
            'plan_name_override' => $plan?->name,
            'plan_description' => $plan?->description,
            'billing_cycle' => $subscription?->billing_period ?? $plan?->billing_period ?? 'yearly',
            'subscription_start_date' => $subscription?->started_at?->toDateString(),
            'subscription_end_date' => $subscription?->expires_at?->toDateString(),
            'license_fee' => $licenseFee,
            'maintenance_fee' => $maintenanceFee,
            'additional_services_fee' => 0,
            'tax_amount' => 0,
            'discount_name' => null,
            'discount_percentage' => null,
            'discount_amount' => 0,
            'total_amount' => $totalAmount,
            'payment_terms' => 'د اړوند بیل (Invoice) له صادرېدو وروسته د دېرش (۳۰) ورځو په موده کې باید تادیه ترسره شي.',
            'payment_notes' => null,
            'max_students' => $getLimit(['students', 'max_students']),
            'max_staff' => $getLimit(['staff', 'max_staff']),
            'max_system_users' => $getLimit(['system_users', 'users', 'max_system_users']),
            'max_storage_gb' => $getLimit(['storage_gb', 'max_storage_gb', 'storage']),
            'limits_notes' => null,
            'implementation_date' => null,
            'training_mode' => 'hybrid',
            'special_requirements' => null,
            'additional_modules' => null,
            'important_terms' => null,
            'acceptance_notes' => null,
            'acceptance_confirmed' => false,
            'customer_signatory_name' => null,
            'customer_signatory_title' => null,
            'customer_signed_at' => null,
            'provider_signatory_name' => null,
            'provider_signatory_title' => null,
            'provider_signed_at' => null,
            'internal_notes' => null,
        ], self::PROVIDER_DEFAULTS);
    }

    private function getNazimLogoDataUri(): ?string
    {
        $paths = [
            base_path('../frontend/public/nazim_logo.webp'),
            public_path('nazim_logo.webp'),
            base_path('public/nazim_logo.webp'),
        ];

        foreach ($paths as $path) {
            if (is_file($path)) {
                $mime = match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
                    'webp' => 'image/webp',
                    'png' => 'image/png',
                    'jpg', 'jpeg' => 'image/jpeg',
                    default => 'image/webp',
                };
                return 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($path));
            }
        }

        return null;
    }

    private function buildSubscriptionContext(?OrganizationSubscription $subscription): array
    {
        if (!$subscription) {
            return [
                'license_paid' => false,
                'license_paid_at' => null,
                'license_payment_amount' => null,
                'license_payment_currency' => null,
            ];
        }

        $licensePayment = $subscription->licensePayment;

        return [
            'license_paid' => $subscription->hasLicensePaid(),
            'license_paid_at' => $subscription->license_paid_at?->toIso8601String(),
            'license_payment_amount' => $licensePayment ? (float) $licensePayment->amount : null,
            'license_payment_currency' => $licensePayment?->currency,
        ];
    }

    private function generateFormNumber(?string $slug = null): string
    {
        $prefix = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', (string) $slug), 0, 4) ?: 'NAZM');
        return $prefix . '-' . now()->format('Ymd');
    }
}
