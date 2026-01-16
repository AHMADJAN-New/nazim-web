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
     * Creates the maintenance_invoices table for tracking auto-generated maintenance invoices.
     * 
     * Invoices are auto-generated based on billing_period and track:
     * - Amount due and currency
     * - Due date and billing period covered
     * - Status (pending, paid, overdue, cancelled)
     * - Link to payment record when paid
     */
    public function up(): void
    {
        Schema::create('maintenance_invoices', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('subscription_id');
            
            // Invoice details
            $table->string('invoice_number', 50)->unique();
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('AFN');
            
            // Billing period info
            $table->string('billing_period', 20)->default('yearly');
            $table->date('period_start');
            $table->date('period_end');
            $table->date('due_date');
            
            // Status tracking
            $table->string('status', 30)->default('pending'); // pending, paid, overdue, cancelled
            $table->timestamp('generated_at');
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            
            // Payment link
            $table->uuid('payment_record_id')->nullable();
            
            // Additional info
            $table->text('notes')->nullable();
            $table->jsonb('metadata')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // Foreign keys
            $table->foreign('organization_id')
                ->references('id')
                ->on('organizations')
                ->onDelete('cascade');
            
            $table->foreign('subscription_id')
                ->references('id')
                ->on('organization_subscriptions')
                ->onDelete('cascade');
            
            $table->foreign('payment_record_id')
                ->references('id')
                ->on('payment_records')
                ->onDelete('set null');
            
            // Indexes
            $table->index('organization_id');
            $table->index('subscription_id');
            $table->index('invoice_number');
            $table->index('status');
            $table->index('due_date');
            $table->index('billing_period');
            $table->index(['organization_id', 'status']);
            $table->index(['due_date', 'status']); // For finding overdue invoices
        });

        // Add foreign key from payment_records to maintenance_invoices
        Schema::table('payment_records', function (Blueprint $table) {
            $table->foreign('maintenance_invoice_id')
                ->references('id')
                ->on('maintenance_invoices')
                ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove foreign key from payment_records first
        Schema::table('payment_records', function (Blueprint $table) {
            $table->dropForeign(['maintenance_invoice_id']);
        });
        
        Schema::dropIfExists('maintenance_invoices');
    }
};


