<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_invoices', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));

            $table->uuid('organization_id');
            $table->uuid('subscription_id')->nullable();
            $table->uuid('organization_order_form_id')->nullable();

            $table->string('invoice_number', 50)->unique();
            $table->string('currency', 3)->default('AFN');

            // Money fields (one-time)
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2)->default(0);

            // Status workflow
            $table->string('status', 30)->default('draft'); // draft, sent, paid, cancelled
            $table->date('issued_at')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->date('due_date')->nullable();

            $table->text('notes')->nullable();
            $table->jsonb('metadata')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')
                ->references('id')
                ->on('organizations')
                ->onDelete('cascade');

            $table->foreign('subscription_id')
                ->references('id')
                ->on('organization_subscriptions')
                ->onDelete('set null');

            $table->foreign('organization_order_form_id')
                ->references('id')
                ->on('organization_order_forms')
                ->onDelete('set null');

            $table->index('organization_id');
            $table->index('subscription_id');
            $table->index('invoice_number');
            $table->index('status');
            $table->index('due_date');
            $table->index(['organization_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_invoices');
    }
};

