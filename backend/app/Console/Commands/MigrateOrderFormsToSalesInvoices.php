<?php

namespace App\Console\Commands;

use App\Models\OrganizationOrderForm;
use App\Models\OrganizationOrderFormPayment;
use App\Models\PaymentRecord;
use App\Models\SalesInvoice;
use App\Models\SalesInvoiceItem;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class MigrateOrderFormsToSalesInvoices extends Command
{
    protected $signature = 'sales-invoices:migrate-from-order-forms
                            {--dry-run : Show what would change without writing}
                            {--organization_id= : Only migrate a specific organization UUID}';

    protected $description = 'Create Sales Invoices from Order Forms and migrate recorded order-form payments into payment_records';

    public function handle(): int
    {
        if (! Schema::hasTable('sales_invoices')) {
            $this->error('sales_invoices table not found. Run migrations first: php artisan migrate');
            return Command::FAILURE;
        }
        if (! Schema::hasTable('sales_invoice_items')) {
            $this->error('sales_invoice_items table not found. Run migrations first: php artisan migrate');
            return Command::FAILURE;
        }
        if (! Schema::hasColumn('payment_records', 'sales_invoice_id')) {
            $this->error('payment_records.sales_invoice_id not found. Run migrations first: php artisan migrate');
            return Command::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');
        $orgId = $this->option('organization_id');

        $query = OrganizationOrderForm::whereNull('deleted_at');
        if (is_string($orgId) && $orgId !== '') {
            $query->where('organization_id', $orgId);
        }

        $forms = $query->orderByDesc('updated_at')->orderByDesc('created_at')->get();

        if ($forms->isEmpty()) {
            $this->info('No order forms found.');
            return Command::SUCCESS;
        }

        $this->info('Found '.$forms->count().' order form(s).');
        if ($dryRun) {
            $this->warn('DRY RUN MODE - no database writes will be performed.');
        }

        $createdInvoices = 0;
        $skippedInvoices = 0;
        $migratedPayments = 0;
        $skippedPayments = 0;
        $migratedMaintenancePayments = 0;

        foreach ($forms as $form) {
            // One order form per organization is enforced by unique index, but be defensive.
            $existingInvoice = SalesInvoice::where('organization_id', $form->organization_id)
                ->whereNull('deleted_at')
                ->orderByDesc('updated_at')
                ->orderByDesc('created_at')
                ->first();

            if ($existingInvoice) {
                $skippedInvoices++;
                $invoice = $existingInvoice;
            } else {
                $this->line("Creating sales invoice for org {$form->organization_id} (order_form={$form->id})");

                if ($dryRun) {
                    $invoice = null;
                } else {
                    $invoice = DB::transaction(function () use ($form) {
                        $invoice = SalesInvoice::create([
                            'organization_id' => $form->organization_id,
                            'subscription_id' => $form->subscription_id,
                            'organization_order_form_id' => $form->id,
                            'currency' => $form->currency ?? 'AFN',
                            'subtotal' => (float) $form->license_fee + (float) $form->additional_services_fee + (float) $form->tax_amount,
                            'tax_amount' => (float) $form->tax_amount,
                            'discount_amount' => (float) $form->discount_amount,
                            'total_amount' => (float) $form->total_amount,
                            'status' => SalesInvoice::STATUS_DRAFT,
                            'issued_at' => $form->issue_date,
                            'due_date' => null,
                            'metadata' => [
                                'source' => 'order_form_migration',
                                'order_form_id' => $form->id,
                            ],
                        ]);

                        $items = [
                            [
                                'code' => 'license_fee',
                                'title' => 'License fee',
                                'description' => $form->plan_description,
                                'quantity' => 1,
                                'unit_price' => (float) $form->license_fee,
                                'sort_order' => 0,
                            ],
                            [
                                'code' => 'additional_services_fee',
                                'title' => 'Additional services',
                                'description' => $form->additional_modules,
                                'quantity' => 1,
                                'unit_price' => (float) $form->additional_services_fee,
                                'sort_order' => 1,
                            ],
                            [
                                'code' => 'tax_amount',
                                'title' => 'Tax / other fees',
                                'description' => $form->payment_notes,
                                'quantity' => 1,
                                'unit_price' => (float) $form->tax_amount,
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

                        return $invoice;
                    });

                    $createdInvoices++;
                }
            }

            // Migrate recorded order-form payments.
            $payments = OrganizationOrderFormPayment::where('organization_id', $form->organization_id)
                ->where('organization_order_form_id', $form->id)
                ->whereNull('deleted_at')
                ->orderBy('payment_date')
                ->get();

            if ($payments->isEmpty()) {
                continue;
            }

            foreach ($payments as $p) {
                // We ONLY link license payments to the sales invoice.
                // Maintenance payments are migrated to payment_records for audit/history,
                // but remain outside the sales invoice (maintenance is handled separately).
                $linkToSalesInvoice = ($p->payment_type === 'license');

                // Skip if already migrated (best-effort): find a payment_record with same org, date, amount, ref.
                $already = PaymentRecord::where('organization_id', $p->organization_id)
                    ->whereDate('payment_date', $p->payment_date)
                    ->where('amount', (float) $p->amount)
                    ->where('currency', $p->currency)
                    ->where('payment_reference', $p->payment_reference)
                    ->whereNull('deleted_at')
                    ->first();

                if ($already) {
                    $skippedPayments++;
                    continue;
                }

                if ($dryRun) {
                    if ($p->payment_type === 'maintenance') {
                        $migratedMaintenancePayments++;
                    } else {
                        $migratedPayments++;
                    }
                    continue;
                }

                PaymentRecord::create([
                    'organization_id' => $p->organization_id,
                    'subscription_id' => $form->subscription_id,
                    'amount' => (float) $p->amount,
                    'currency' => $p->currency ?? ($form->currency ?? 'AFN'),
                    'payment_method' => $p->payment_method ?? PaymentRecord::METHOD_OTHER,
                    'payment_reference' => $p->payment_reference,
                    'payment_date' => $p->payment_date,
                    'status' => PaymentRecord::STATUS_CONFIRMED,
                    'confirmed_by' => $p->created_by,
                    'confirmed_at' => $p->created_at ?? now(),
                    'discount_amount' => 0,
                    'notes' => $p->notes,
                    'metadata' => [
                        'source' => 'order_form_payment',
                        'order_form_payment_id' => $p->id,
                        'order_form_id' => $p->organization_order_form_id,
                    ],
                    'payment_type' => $p->payment_type === 'maintenance'
                        ? PaymentRecord::TYPE_MAINTENANCE
                        : PaymentRecord::TYPE_LICENSE,
                    'billing_period' => PaymentRecord::BILLING_CUSTOM,
                    'is_recurring' => false,
                    'sales_invoice_id' => ($linkToSalesInvoice && isset($invoice) && $invoice) ? $invoice->id : null,
                ]);

                if ($p->payment_type === 'maintenance') {
                    $migratedMaintenancePayments++;
                } else {
                    $migratedPayments++;
                }
            }
        }

        $this->newLine();
        $this->info('Summary:');
        $this->line('  Invoices created: '.$createdInvoices);
        $this->line('  Invoices skipped (already existed): '.$skippedInvoices);
        $this->line('  License payments migrated: '.$migratedPayments);
        $this->line('  Maintenance payments migrated (unlinked): '.$migratedMaintenancePayments);
        $this->line('  Payments skipped (already migrated): '.$skippedPayments);

        return Command::SUCCESS;
    }
}

