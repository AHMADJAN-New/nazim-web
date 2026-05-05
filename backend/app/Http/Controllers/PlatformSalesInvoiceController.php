<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\OrganizationOrderForm;
use App\Models\PaymentRecord;
use App\Models\SalesInvoice;
use App\Models\SalesInvoiceItem;
use App\Services\SalesInvoicePdfService;
use App\Services\Reports\DateConversionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class PlatformSalesInvoiceController extends Controller
{
    public function __construct(
        private SalesInvoicePdfService $pdfService,
        private DateConversionService $dateService
    ) {}

    public function show(Request $request, string $organizationId)
    {
        $organization = Organization::findOrFail($organizationId);

        $invoice = SalesInvoice::with(['items', 'paymentRecords'])
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->orderByDesc('updated_at')
            ->orderByDesc('created_at')
            ->first();

        // If there is no invoice yet, create one from latest order form snapshot (if any).
        if (! $invoice) {
            $invoice = $this->createInvoiceFromLatestOrderForm($organizationId);
        }

        if (! $invoice) {
            return response()->json([
                'data' => [
                    'invoice' => null,
                    'items' => [],
                    'payments' => [],
                    'payment_summary' => null,
                ],
            ]);
        }

        return response()->json([
            'data' => [
                'invoice' => $this->serializeInvoice($invoice),
                'items' => $invoice->items->map(fn (SalesInvoiceItem $i) => $this->serializeItem($i))->values()->all(),
                'payments' => $invoice->paymentRecords->map(fn (PaymentRecord $p) => $this->serializePaymentRecord($p))->values()->all(),
                'payment_summary' => $this->buildPaymentSummary($invoice),
            ],
        ]);
    }

    public function upsert(Request $request, string $organizationId)
    {
        Organization::findOrFail($organizationId);

        $validator = Validator::make($request->all(), [
            'currency' => 'nullable|string|in:AFN,USD',
            'due_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'items' => 'nullable|array',
            'items.*.title' => 'required_with:items|string|max:255',
            'items.*.description' => 'nullable|string',
            'items.*.quantity' => 'nullable|integer|min:1',
            'items.*.unit_price' => 'nullable|numeric|min:0',
            'items.*.code' => 'nullable|string|max:50',
            'items.*.sort_order' => 'nullable|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        $invoice = SalesInvoice::where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->orderByDesc('updated_at')
            ->orderByDesc('created_at')
            ->first();

        if (! $invoice) {
            $invoice = $this->createInvoiceFromLatestOrderForm($organizationId)
                ?? SalesInvoice::create([
                    'organization_id' => $organizationId,
                    'currency' => $validated['currency'] ?? 'AFN',
                    'status' => SalesInvoice::STATUS_DRAFT,
                ]);
        }

        DB::transaction(function () use ($invoice, $validated) {
            if (isset($validated['currency'])) {
                $invoice->currency = $validated['currency'];
            }
            if (array_key_exists('due_date', $validated)) {
                $invoice->due_date = $validated['due_date'];
            }
            if (array_key_exists('notes', $validated)) {
                $invoice->notes = $validated['notes'];
            }

            $invoice->save();

            if (isset($validated['items']) && is_array($validated['items'])) {
                // Replace items (simple and safe for this first version)
                SalesInvoiceItem::where('sales_invoice_id', $invoice->id)->delete();

                $items = [];
                foreach ($validated['items'] as $idx => $item) {
                    $qty = (int) ($item['quantity'] ?? 1);
                    $unit = (float) ($item['unit_price'] ?? 0);
                    $lineTotal = round($qty * $unit, 2);
                    $items[] = SalesInvoiceItem::create([
                        'sales_invoice_id' => $invoice->id,
                        'item_type' => 'line',
                        'code' => $item['code'] ?? null,
                        'title' => $item['title'],
                        'description' => $item['description'] ?? null,
                        'quantity' => $qty,
                        'unit_price' => $unit,
                        'line_total' => $lineTotal,
                        'sort_order' => (int) ($item['sort_order'] ?? $idx),
                    ]);
                }

                // Recompute totals
                $subtotal = (float) collect($items)->sum(fn (SalesInvoiceItem $i) => (float) $i->line_total);
                $invoice->subtotal = $subtotal;
                // tax/discount kept as separate fields for now; caller can include them via items if desired
                $invoice->total_amount = max(($invoice->subtotal + (float) $invoice->tax_amount) - (float) $invoice->discount_amount, 0);
                $invoice->save();
            }
        });

        $invoice->loadMissing(['items', 'paymentRecords']);

        return response()->json([
            'data' => [
                'invoice' => $this->serializeInvoice($invoice),
                'items' => $invoice->items->map(fn (SalesInvoiceItem $i) => $this->serializeItem($i))->values()->all(),
                'payments' => $invoice->paymentRecords->map(fn (PaymentRecord $p) => $this->serializePaymentRecord($p))->values()->all(),
                'payment_summary' => $this->buildPaymentSummary($invoice),
            ],
            'message' => 'Invoice saved successfully',
        ]);
    }

    public function downloadPdf(Request $request, string $organizationId)
    {
        $organization = Organization::findOrFail($organizationId);

        $invoice = SalesInvoice::with(['items', 'paymentRecords'])
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->orderByDesc('updated_at')
            ->orderByDesc('created_at')
            ->first();

        if (! $invoice) {
            $invoice = $this->createInvoiceFromLatestOrderForm($organizationId);
        }

        if (! $invoice) {
            abort(404, 'Invoice not found');
        }

        $calendarPreference = $request->query('calendar_preference', 'jalali');
        $language = $request->query('language', 'ps');
        $dateFormat = 'dmy';
        $formatDateFn = fn ($date, $format = null) => $date
            ? $this->dateService->formatDate($date, $calendarPreference, $format ?? $dateFormat, $language)
            : '—';

        $pdfPath = $this->pdfService->generate([
            'organization' => $organization,
            'invoice' => $this->serializeInvoice($invoice),
            'items' => $invoice->items->map(fn (SalesInvoiceItem $i) => $this->serializeItem($i))->values()->all(),
            'payments' => $invoice->paymentRecords->map(fn (PaymentRecord $p) => $this->serializePaymentRecord($p))->values()->all(),
            'payment_summary' => $this->buildPaymentSummary($invoice),
            'formatDate' => $formatDateFn,
            'calendar_preference' => $calendarPreference,
            'language' => $language,
        ], ($invoice->invoice_number ?? 'sales-invoice').'-'.($organization->slug ?? 'organization'));

        return response()->download(
            $pdfPath,
            ($invoice->invoice_number ?? 'sales-invoice').'.pdf',
            ['Content-Type' => 'application/pdf']
        )->deleteFileAfterSend(true);
    }

    public function storePayment(Request $request, string $organizationId)
    {
        Organization::findOrFail($organizationId);

        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:0.01',
            'currency' => 'required|string|in:AFN,USD',
            'payment_method' => 'required|string|max:50',
            'payment_reference' => 'nullable|string|max:255',
            'payment_date' => 'required|date',
            'notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        $invoice = SalesInvoice::where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->orderByDesc('updated_at')
            ->orderByDesc('created_at')
            ->first();

        if (! $invoice) {
            $invoice = $this->createInvoiceFromLatestOrderForm($organizationId);
        }

        if (! $invoice) {
            abort(404, 'Invoice not found');
        }

        $payment = PaymentRecord::create([
            'organization_id' => $organizationId,
            'subscription_id' => $invoice->subscription_id,
            'amount' => (float) $validated['amount'],
            'currency' => $validated['currency'],
            'payment_method' => $validated['payment_method'],
            'payment_reference' => $validated['payment_reference'] ?? null,
            'payment_date' => $validated['payment_date'],
            'status' => PaymentRecord::STATUS_CONFIRMED,
            'confirmed_by' => (string) $request->user()->id,
            'confirmed_at' => now(),
            'notes' => $validated['notes'] ?? null,
            'payment_type' => PaymentRecord::TYPE_LICENSE,
            'billing_period' => PaymentRecord::BILLING_CUSTOM,
            'is_recurring' => false,
            'sales_invoice_id' => $invoice->id,
        ]);

        // Auto-mark paid if fully covered
        $summary = $this->buildPaymentSummary($invoice->fresh(['paymentRecords']));
        if (($summary['due'] ?? 0) <= 0.00001 && $invoice->status !== SalesInvoice::STATUS_PAID) {
            $invoice->status = SalesInvoice::STATUS_PAID;
            $invoice->paid_at = now();
            $invoice->save();
        }

        return response()->json([
            'data' => $this->serializePaymentRecord($payment),
            'message' => 'Payment recorded successfully',
        ], 201);
    }

    private function createInvoiceFromLatestOrderForm(string $organizationId): ?SalesInvoice
    {
        $orderForm = OrganizationOrderForm::with([])
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->orderByDesc('updated_at')
            ->orderByDesc('created_at')
            ->first();

        if (! $orderForm) {
            return null;
        }

        return DB::transaction(function () use ($orderForm) {
            $invoice = SalesInvoice::create([
                'organization_id' => $orderForm->organization_id,
                'subscription_id' => $orderForm->subscription_id,
                'organization_order_form_id' => $orderForm->id,
                'currency' => $orderForm->currency ?? 'AFN',
                'subtotal' => (float) $orderForm->license_fee + (float) $orderForm->additional_services_fee + (float) $orderForm->tax_amount,
                'tax_amount' => (float) $orderForm->tax_amount,
                'discount_amount' => (float) $orderForm->discount_amount,
                'total_amount' => (float) $orderForm->total_amount,
                'status' => SalesInvoice::STATUS_DRAFT,
                'issued_at' => $orderForm->issue_date,
                'due_date' => null,
                'notes' => null,
                'metadata' => [
                    'source' => 'order_form',
                    'order_form_id' => $orderForm->id,
                ],
            ]);

            $items = [
                [
                    'code' => 'license_fee',
                    'title' => 'License fee',
                    'description' => $orderForm->plan_description,
                    'quantity' => 1,
                    'unit_price' => (float) $orderForm->license_fee,
                    'sort_order' => 0,
                ],
                [
                    'code' => 'additional_services_fee',
                    'title' => 'Additional services',
                    'description' => $orderForm->additional_modules,
                    'quantity' => 1,
                    'unit_price' => (float) $orderForm->additional_services_fee,
                    'sort_order' => 1,
                ],
                [
                    'code' => 'tax_amount',
                    'title' => 'Tax / other fees',
                    'description' => $orderForm->payment_notes,
                    'quantity' => 1,
                    'unit_price' => (float) $orderForm->tax_amount,
                    'sort_order' => 2,
                ],
            ];

            foreach ($items as $item) {
                $qty = (int) ($item['quantity'] ?? 1);
                $unit = (float) ($item['unit_price'] ?? 0);
                $lineTotal = round($qty * $unit, 2);
                SalesInvoiceItem::create([
                    'sales_invoice_id' => $invoice->id,
                    'item_type' => 'line',
                    'code' => $item['code'] ?? null,
                    'title' => $item['title'],
                    'description' => $item['description'] ?? null,
                    'quantity' => $qty,
                    'unit_price' => $unit,
                    'line_total' => $lineTotal,
                    'sort_order' => (int) ($item['sort_order'] ?? 0),
                ]);
            }

            $invoice->loadMissing(['items', 'paymentRecords']);

            return $invoice;
        });
    }

    private function serializeInvoice(SalesInvoice $invoice): array
    {
        return [
            'id' => $invoice->id,
            'organization_id' => $invoice->organization_id,
            'subscription_id' => $invoice->subscription_id,
            'organization_order_form_id' => $invoice->organization_order_form_id,
            'invoice_number' => $invoice->invoice_number,
            'currency' => $invoice->currency,
            'subtotal' => $invoice->subtotal !== null ? (float) $invoice->subtotal : 0,
            'tax_amount' => $invoice->tax_amount !== null ? (float) $invoice->tax_amount : 0,
            'discount_amount' => $invoice->discount_amount !== null ? (float) $invoice->discount_amount : 0,
            'total_amount' => $invoice->total_amount !== null ? (float) $invoice->total_amount : 0,
            'status' => $invoice->status,
            'issued_at' => $invoice->issued_at?->toDateString(),
            'due_date' => $invoice->due_date?->toDateString(),
            'sent_at' => $invoice->sent_at?->toIso8601String(),
            'paid_at' => $invoice->paid_at?->toIso8601String(),
            'cancelled_at' => $invoice->cancelled_at?->toIso8601String(),
            'notes' => $invoice->notes,
            'created_at' => $invoice->created_at?->toIso8601String(),
            'updated_at' => $invoice->updated_at?->toIso8601String(),
        ];
    }

    private function serializeItem(SalesInvoiceItem $item): array
    {
        return [
            'id' => $item->id,
            'sales_invoice_id' => $item->sales_invoice_id,
            'item_type' => $item->item_type,
            'code' => $item->code,
            'title' => $item->title,
            'description' => $item->description,
            'quantity' => (int) ($item->quantity ?? 1),
            'unit_price' => $item->unit_price !== null ? (float) $item->unit_price : 0,
            'line_total' => $item->line_total !== null ? (float) $item->line_total : 0,
            'sort_order' => (int) ($item->sort_order ?? 0),
        ];
    }

    private function serializePaymentRecord(PaymentRecord $payment): array
    {
        return [
            'id' => $payment->id,
            'amount' => $payment->amount !== null ? (float) $payment->amount : 0,
            'currency' => $payment->currency,
            'payment_method' => $payment->payment_method,
            'payment_reference' => $payment->payment_reference,
            'payment_date' => $payment->payment_date?->toDateString(),
            'status' => $payment->status,
            'notes' => $payment->notes,
            'created_at' => $payment->created_at?->toIso8601String(),
        ];
    }

    private function buildPaymentSummary(SalesInvoice $invoice): array
    {
        $paid = (float) $invoice->paymentRecords
            ->where('status', PaymentRecord::STATUS_CONFIRMED)
            ->sum(fn (PaymentRecord $p) => (float) $p->amount);

        $total = (float) ($invoice->total_amount ?? 0);

        return [
            'total' => $total,
            'paid' => $paid,
            'due' => max($total - $paid, 0),
        ];
    }
}

