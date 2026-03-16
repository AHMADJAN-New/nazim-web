<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organization_order_forms', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('subscription_id')->nullable();
            $table->uuid('plan_id')->nullable();
            $table->string('status', 30)->default('draft');
            $table->string('form_number', 80)->nullable();
            $table->date('issue_date')->nullable();
            $table->string('currency', 3)->default('AFN');

            $table->string('customer_organization_name')->nullable();
            $table->text('customer_address')->nullable();
            $table->string('customer_contact_name')->nullable();
            $table->string('customer_contact_title')->nullable();
            $table->string('customer_email')->nullable();
            $table->string('customer_phone', 50)->nullable();
            $table->string('customer_whatsapp', 50)->nullable();
            $table->text('customer_notes')->nullable();

            $table->string('provider_organization_name')->nullable();
            $table->text('provider_address')->nullable();
            $table->string('provider_contact_name')->nullable();
            $table->string('provider_contact_title')->nullable();
            $table->string('provider_email')->nullable();
            $table->string('provider_phone', 50)->nullable();
            $table->string('provider_website')->nullable();
            $table->text('provider_notes')->nullable();

            $table->string('plan_name_override')->nullable();
            $table->text('plan_description')->nullable();
            $table->string('billing_cycle', 30)->nullable();
            $table->date('subscription_start_date')->nullable();
            $table->date('subscription_end_date')->nullable();

            $table->decimal('license_fee', 12, 2)->default(0);
            $table->decimal('maintenance_fee', 12, 2)->default(0);
            $table->decimal('additional_services_fee', 12, 2)->default(0);
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->string('discount_name')->nullable();
            $table->decimal('discount_percentage', 5, 2)->nullable();
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->text('payment_terms')->nullable();
            $table->text('payment_notes')->nullable();

            $table->integer('max_students')->nullable();
            $table->integer('max_staff')->nullable();
            $table->integer('max_system_users')->nullable();
            $table->decimal('max_storage_gb', 10, 2)->nullable();
            $table->text('limits_notes')->nullable();

            $table->date('implementation_date')->nullable();
            $table->string('training_mode', 30)->nullable();
            $table->text('special_requirements')->nullable();
            $table->text('additional_modules')->nullable();
            $table->text('important_terms')->nullable();

            $table->text('acceptance_notes')->nullable();
            $table->boolean('acceptance_confirmed')->default(false);
            $table->string('customer_signatory_name')->nullable();
            $table->string('customer_signatory_title')->nullable();
            $table->date('customer_signed_at')->nullable();
            $table->string('provider_signatory_name')->nullable();
            $table->string('provider_signatory_title')->nullable();
            $table->date('provider_signed_at')->nullable();
            $table->text('internal_notes')->nullable();

            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
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

            $table->foreign('plan_id')
                ->references('id')
                ->on('subscription_plans')
                ->onDelete('set null');

            $table->foreign('created_by')
                ->references('id')
                ->on('users')
                ->onDelete('set null');

            $table->foreign('updated_by')
                ->references('id')
                ->on('users')
                ->onDelete('set null');

            $table->unique('organization_id');
            $table->index('organization_id');
            $table->index('subscription_id');
            $table->index('plan_id');
            $table->index('status');
        });

        Schema::create('organization_order_form_documents', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_order_form_id');
            $table->uuid('organization_id');
            $table->string('document_category', 50);
            $table->string('title');
            $table->text('notes')->nullable();
            $table->string('file_name');
            $table->string('file_path', 500);
            $table->string('mime_type', 120)->nullable();
            $table->unsignedBigInteger('file_size')->default(0);
            $table->uuid('uploaded_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_order_form_id')
                ->references('id')
                ->on('organization_order_forms')
                ->onDelete('cascade');

            $table->foreign('organization_id')
                ->references('id')
                ->on('organizations')
                ->onDelete('cascade');

            $table->foreign('uploaded_by')
                ->references('id')
                ->on('users')
                ->onDelete('set null');

            $table->index('organization_order_form_id');
            $table->index('organization_id');
            $table->index('document_category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organization_order_form_documents');
        Schema::dropIfExists('organization_order_forms');
    }
};
