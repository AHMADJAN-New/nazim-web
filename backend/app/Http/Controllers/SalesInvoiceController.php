<?php

namespace App\Http\Controllers;

use App\Models\PaymentRecord;
use App\Models\SalesInvoice;
use App\Models\SalesInvoiceItem;
use App\Services\SalesInvoicePdfService;
use App\Services\Reports\DateConversionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SalesInvoiceController extends Controller
{
    public function __construct(
        private SalesInvoicePdfService $pdfService,
        private DateConversionService $dateService
    ) {}

    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile || ! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (! $user->hasPermissionTo('subscription.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for subscription.read: '.$e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $invoices = SalesInvoice::with([])
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->orderByDesc('issued_at')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $invoices->map(fn (SalesInvoice $i) => $this->serializeInvoice($i))->values()->all(),
        ]);
    }

    public function show(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile || ! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (! $user->hasPermissionTo('subscription.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for subscription.read: '.$e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $invoice = SalesInvoice::with(['items', 'paymentRecords'])
            ->where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (! $invoice) {
            return response()->json(['error' => 'Invoice not found'], 404);
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

    public function downloadPdf(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile || ! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (! $user->hasPermissionTo('subscription.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for subscription.read: '.$e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $invoice = SalesInvoice::with(['items', 'paymentRecords', 'organization'])
            ->where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

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
            'organization' => $invoice->organization,
            'invoice' => $this->serializeInvoice($invoice),
            'items' => $invoice->items->map(fn (SalesInvoiceItem $i) => $this->serializeItem($i))->values()->all(),
            'payments' => $invoice->paymentRecords->map(fn (PaymentRecord $p) => $this->serializePaymentRecord($p))->values()->all(),
            'payment_summary' => $this->buildPaymentSummary($invoice),
            'formatDate' => $formatDateFn,
            'calendar_preference' => $calendarPreference,
            'language' => $language,
        ], ($invoice->invoice_number ?? 'sales-invoice'));

        return response()->download(
            $pdfPath,
            ($invoice->invoice_number ?? 'sales-invoice').'.pdf',
            ['Content-Type' => 'application/pdf']
        )->deleteFileAfterSend(true);
    }

    private function serializeInvoice(SalesInvoice $invoice): array
    {
        return [
            'id' => $invoice->id,
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
        ];
    }

    private function serializeItem(SalesInvoiceItem $item): array
    {
        return [
            'id' => $item->id,
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

