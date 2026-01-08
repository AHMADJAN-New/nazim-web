<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Adds payment type tracking to payment_records:
     * 
     * - payment_type: 'license', 'maintenance', 'renewal' (legacy)
     * - billing_period: The billing period this payment covers
     * - is_recurring: Whether this is a recurring payment (maintenance fees)
     * - invoice_number: Auto-generated invoice number for maintenance invoices
     * - invoice_generated_at: When the invoice was auto-generated
     * - maintenance_invoice_id: Reference to maintenance_invoices table
     */
    public function up(): void
    {
        Schema::table('payment_records', function (Blueprint $table) {
            // Payment type classification
            $table->string('payment_type', 20)->default('renewal')->after('status');
            
            // Billing period for this payment
            $table->string('billing_period', 20)->default('yearly')->after('payment_type');
            
            // Recurring flag
            $table->boolean('is_recurring')->default(false)->after('billing_period');
            
            // Invoice tracking
            $table->string('invoice_number', 50)->nullable()->after('is_recurring');
            $table->timestamp('invoice_generated_at')->nullable()->after('invoice_number');
            
            // Reference to maintenance invoice (will be added after maintenance_invoices table is created)
            $table->uuid('maintenance_invoice_id')->nullable()->after('invoice_generated_at');
            
            // Indexes
            $table->index('payment_type');
            $table->index('is_recurring');
            $table->index('invoice_number');
        });

        // Mark existing payments as 'renewal' (legacy)
        // These were payments for the old yearly renewal model
        DB::statement("
            UPDATE payment_records 
            SET 
                payment_type = 'renewal',
                billing_period = 'yearly',
                is_recurring = false
            WHERE deleted_at IS NULL
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_records', function (Blueprint $table) {
            $table->dropIndex(['payment_type']);
            $table->dropIndex(['is_recurring']);
            $table->dropIndex(['invoice_number']);
            
            $table->dropColumn([
                'payment_type',
                'billing_period',
                'is_recurring',
                'invoice_number',
                'invoice_generated_at',
                'maintenance_invoice_id',
            ]);
        });
    }
};

