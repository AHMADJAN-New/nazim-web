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
     * Creates all SaaS subscription system tables:
     * - subscription_plans: Available plans (Trial, Starter, Basic, Pro, Enterprise)
     * - feature_definitions: All available features that can be toggled
     * - limit_definitions: All resources that can be limited
     * - plan_features: Which features are enabled per plan
     * - plan_limits: Limit values per plan
     * - organization_subscriptions: Organization's active subscription
     * - organization_feature_addons: Individual feature purchases
     * - organization_limit_overrides: Custom limit overrides per org
     * - usage_current: Real-time usage tracking
     * - payment_records: Manual payment tracking
     * - renewal_requests: Renewal workflow
     * - discount_codes: Promotional codes
     * - discount_code_usage: Track discount code usage
     * - subscription_history: Audit trail
     * - usage_snapshots: Monthly usage snapshots
     */
    public function up(): void
    {
        // =====================================================
        // SUBSCRIPTION PLANS
        // =====================================================
        Schema::create('subscription_plans', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('name', 100);
            $table->string('slug', 50)->unique();
            $table->text('description')->nullable();
            $table->decimal('price_yearly_afn', 12, 2)->default(0);
            $table->decimal('price_yearly_usd', 12, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_default')->default(false);
            $table->boolean('is_custom')->default(false);
            $table->uuid('custom_for_organization_id')->nullable();
            $table->integer('trial_days')->default(0);
            $table->integer('grace_period_days')->default(14);
            $table->integer('readonly_period_days')->default(60);
            $table->integer('max_schools')->default(1);
            $table->decimal('per_school_price_afn', 12, 2)->default(0);
            $table->decimal('per_school_price_usd', 12, 2)->default(0);
            $table->integer('sort_order')->default(0);
            $table->jsonb('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('slug');
            $table->index('is_active');
            $table->index('is_default');
            $table->index('custom_for_organization_id');
        });

        // =====================================================
        // FEATURE DEFINITIONS
        // =====================================================
        Schema::create('feature_definitions', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('feature_key', 100)->unique();
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->string('category', 50);
            $table->boolean('is_addon')->default(false);
            $table->decimal('addon_price_yearly_afn', 12, 2)->default(0);
            $table->decimal('addon_price_yearly_usd', 12, 2)->default(0);
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('feature_key');
            $table->index('category');
            $table->index('is_addon');
        });

        // =====================================================
        // LIMIT DEFINITIONS
        // =====================================================
        Schema::create('limit_definitions', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('resource_key', 100)->unique();
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->string('unit', 20)->default('count');
            $table->string('reset_period', 20)->default('never');
            $table->string('category', 50);
            $table->string('count_query')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('resource_key');
            $table->index('category');
        });

        // =====================================================
        // PLAN FEATURES (which features are enabled per plan)
        // =====================================================
        Schema::create('plan_features', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('plan_id');
            $table->string('feature_key', 100);
            $table->boolean('is_enabled')->default(true);
            $table->timestamps();

            $table->foreign('plan_id')
                ->references('id')
                ->on('subscription_plans')
                ->onDelete('cascade');

            $table->unique(['plan_id', 'feature_key']);
            $table->index('feature_key');
        });

        // =====================================================
        // PLAN LIMITS (limit values per plan)
        // =====================================================
        Schema::create('plan_limits', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('plan_id');
            $table->string('resource_key', 100);
            $table->integer('limit_value')->default(-1);
            $table->integer('warning_threshold')->default(80);
            $table->timestamps();

            $table->foreign('plan_id')
                ->references('id')
                ->on('subscription_plans')
                ->onDelete('cascade');

            $table->unique(['plan_id', 'resource_key']);
            $table->index('resource_key');
        });

        // =====================================================
        // ORGANIZATION SUBSCRIPTIONS
        // =====================================================
        Schema::create('organization_subscriptions', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('plan_id');
            $table->string('status', 30)->default('trial');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('grace_period_ends_at')->nullable();
            $table->timestamp('readonly_period_ends_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('suspension_reason')->nullable();
            $table->boolean('auto_renew')->default(true);
            $table->string('currency', 3)->default('AFN');
            $table->decimal('amount_paid', 12, 2)->default(0);
            $table->integer('additional_schools')->default(0);
            $table->text('notes')->nullable();
            $table->jsonb('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')
                ->references('id')
                ->on('organizations')
                ->onDelete('cascade');

            $table->foreign('plan_id')
                ->references('id')
                ->on('subscription_plans')
                ->onDelete('restrict');

            $table->index('organization_id');
            $table->index('plan_id');
            $table->index('status');
            $table->index('expires_at');
        });

        // =====================================================
        // ORGANIZATION FEATURE ADDONS
        // =====================================================
        Schema::create('organization_feature_addons', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->string('feature_key', 100);
            $table->boolean('is_enabled')->default(true);
            $table->timestamp('started_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->decimal('price_paid', 12, 2)->default(0);
            $table->string('currency', 3)->default('AFN');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')
                ->references('id')
                ->on('organizations')
                ->onDelete('cascade');

            $table->unique(['organization_id', 'feature_key']);
            $table->index('feature_key');
            $table->index('expires_at');
        });

        // =====================================================
        // ORGANIZATION LIMIT OVERRIDES
        // =====================================================
        Schema::create('organization_limit_overrides', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->string('resource_key', 100);
            $table->integer('limit_value');
            $table->text('reason')->nullable();
            $table->uuid('granted_by')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')
                ->references('id')
                ->on('organizations')
                ->onDelete('cascade');

            $table->unique(['organization_id', 'resource_key']);
            $table->index('resource_key');
        });

        // =====================================================
        // USAGE CURRENT (Real-time usage tracking)
        // =====================================================
        Schema::create('usage_current', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->string('resource_key', 100);
            $table->bigInteger('current_count')->default(0);
            $table->timestamp('period_start')->nullable();
            $table->timestamp('period_end')->nullable();
            $table->timestamp('last_warning_sent_at')->nullable();
            $table->timestamp('last_calculated_at')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')
                ->references('id')
                ->on('organizations')
                ->onDelete('cascade');

            $table->unique(['organization_id', 'resource_key']);
            $table->index('resource_key');
        });

        // =====================================================
        // PAYMENT RECORDS
        // =====================================================
        Schema::create('payment_records', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('subscription_id')->nullable();
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('AFN');
            $table->string('payment_method', 50);
            $table->string('payment_reference')->nullable();
            $table->date('payment_date');
            $table->date('period_start')->nullable();
            $table->date('period_end')->nullable();
            $table->string('status', 30)->default('pending');
            $table->uuid('confirmed_by')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->uuid('discount_code_id')->nullable();
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->text('notes')->nullable();
            $table->string('receipt_path')->nullable();
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

            $table->index('organization_id');
            $table->index('subscription_id');
            $table->index('status');
            $table->index('payment_date');
        });

        // =====================================================
        // RENEWAL REQUESTS
        // =====================================================
        Schema::create('renewal_requests', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('subscription_id');
            $table->uuid('requested_plan_id');
            $table->string('status', 30)->default('pending');
            $table->timestamp('requested_at');
            $table->uuid('processed_by')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->uuid('payment_record_id')->nullable();
            $table->uuid('discount_code_id')->nullable();
            $table->integer('additional_schools')->default(0);
            $table->text('notes')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')
                ->references('id')
                ->on('organizations')
                ->onDelete('cascade');

            $table->foreign('subscription_id')
                ->references('id')
                ->on('organization_subscriptions')
                ->onDelete('cascade');

            $table->foreign('requested_plan_id')
                ->references('id')
                ->on('subscription_plans')
                ->onDelete('restrict');

            $table->foreign('payment_record_id')
                ->references('id')
                ->on('payment_records')
                ->onDelete('set null');

            $table->index('organization_id');
            $table->index('status');
        });

        // =====================================================
        // DISCOUNT CODES
        // =====================================================
        Schema::create('discount_codes', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('code', 50)->unique();
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->string('discount_type', 20)->default('percentage');
            $table->decimal('discount_value', 12, 2);
            $table->decimal('max_discount_amount', 12, 2)->nullable();
            $table->string('currency', 3)->nullable();
            $table->uuid('applicable_plan_id')->nullable();
            $table->integer('max_uses')->nullable();
            $table->integer('current_uses')->default(0);
            $table->integer('max_uses_per_org')->default(1);
            $table->timestamp('valid_from')->nullable();
            $table->timestamp('valid_until')->nullable();
            $table->boolean('is_active')->default(true);
            $table->uuid('created_by')->nullable();
            $table->jsonb('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('applicable_plan_id')
                ->references('id')
                ->on('subscription_plans')
                ->onDelete('set null');

            $table->index('code');
            $table->index('is_active');
            $table->index('valid_until');
        });

        // =====================================================
        // DISCOUNT CODE USAGE
        // =====================================================
        Schema::create('discount_code_usage', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('discount_code_id');
            $table->uuid('organization_id');
            $table->uuid('payment_record_id')->nullable();
            $table->decimal('discount_applied', 12, 2);
            $table->timestamp('used_at');
            $table->timestamps();

            $table->foreign('discount_code_id')
                ->references('id')
                ->on('discount_codes')
                ->onDelete('cascade');

            $table->foreign('organization_id')
                ->references('id')
                ->on('organizations')
                ->onDelete('cascade');

            $table->foreign('payment_record_id')
                ->references('id')
                ->on('payment_records')
                ->onDelete('set null');

            $table->index('discount_code_id');
            $table->index('organization_id');
        });

        // =====================================================
        // SUBSCRIPTION HISTORY (Audit Trail)
        // =====================================================
        Schema::create('subscription_history', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('subscription_id')->nullable();
            $table->string('action', 50);
            $table->uuid('from_plan_id')->nullable();
            $table->uuid('to_plan_id')->nullable();
            $table->string('from_status', 30)->nullable();
            $table->string('to_status', 30)->nullable();
            $table->uuid('performed_by')->nullable();
            $table->text('notes')->nullable();
            $table->jsonb('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('organization_id')
                ->references('id')
                ->on('organizations')
                ->onDelete('cascade');

            $table->index('organization_id');
            $table->index('subscription_id');
            $table->index('action');
            $table->index('created_at');
        });

        // =====================================================
        // USAGE SNAPSHOTS (Monthly snapshots for records)
        // =====================================================
        Schema::create('usage_snapshots', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->date('snapshot_date');
            $table->uuid('plan_id')->nullable();
            $table->string('plan_name')->nullable();
            $table->jsonb('usage_data');
            $table->jsonb('limits_data')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('organization_id')
                ->references('id')
                ->on('organizations')
                ->onDelete('cascade');

            $table->unique(['organization_id', 'snapshot_date']);
            $table->index('snapshot_date');
        });

        // =====================================================
        // SUBSCRIPTION EMAIL LOGS
        // =====================================================
        Schema::create('subscription_email_logs', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('subscription_id')->nullable();
            $table->string('email_type', 50);
            $table->string('recipient_email');
            $table->string('subject');
            $table->text('body')->nullable();
            $table->string('status', 20)->default('sent');
            $table->timestamp('sent_at');
            $table->text('error_message')->nullable();
            $table->jsonb('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('organization_id')
                ->references('id')
                ->on('organizations')
                ->onDelete('cascade');

            $table->index('organization_id');
            $table->index('email_type');
            $table->index('sent_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subscription_email_logs');
        Schema::dropIfExists('usage_snapshots');
        Schema::dropIfExists('subscription_history');
        Schema::dropIfExists('discount_code_usage');
        Schema::dropIfExists('discount_codes');
        Schema::dropIfExists('renewal_requests');
        Schema::dropIfExists('payment_records');
        Schema::dropIfExists('usage_current');
        Schema::dropIfExists('organization_limit_overrides');
        Schema::dropIfExists('organization_feature_addons');
        Schema::dropIfExists('organization_subscriptions');
        Schema::dropIfExists('plan_limits');
        Schema::dropIfExists('plan_features');
        Schema::dropIfExists('limit_definitions');
        Schema::dropIfExists('feature_definitions');
        Schema::dropIfExists('subscription_plans');
    }
};
