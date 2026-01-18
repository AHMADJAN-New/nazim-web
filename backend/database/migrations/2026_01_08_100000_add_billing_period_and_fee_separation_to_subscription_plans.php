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
     * Adds billing period configuration and separates license fees from maintenance fees.
     * 
     * - billing_period: 'monthly', 'quarterly', 'yearly', 'custom'
     * - license_fee_*: One-time license fee (paid once)
     * - maintenance_fee_*: Recurring maintenance fee (based on billing_period)
     * - custom_billing_days: Number of days for custom billing period
     * 
     * Migration strategy:
     * - Existing price_yearly_* values are migrated to maintenance_fee_*
     * - license_fee_* defaults to 0 (existing plans don't have license fees)
     * - billing_period defaults to 'yearly' (existing behavior)
     */
    public function up(): void
    {
        Schema::table('subscription_plans', function (Blueprint $table) {
            // Billing period configuration
            $table->string('billing_period', 20)->default('yearly')->after('per_school_price_usd');
            $table->integer('custom_billing_days')->nullable()->after('billing_period');
            
            // License fee (one-time)
            $table->decimal('license_fee_afn', 12, 2)->default(0)->after('custom_billing_days');
            $table->decimal('license_fee_usd', 12, 2)->default(0)->after('license_fee_afn');
            
            // Maintenance fee (recurring based on billing_period)
            $table->decimal('maintenance_fee_afn', 12, 2)->default(0)->after('license_fee_usd');
            $table->decimal('maintenance_fee_usd', 12, 2)->default(0)->after('maintenance_fee_afn');
            
            // Per-school maintenance fee (recurring)
            $table->decimal('per_school_maintenance_fee_afn', 12, 2)->default(0)->after('maintenance_fee_usd');
            $table->decimal('per_school_maintenance_fee_usd', 12, 2)->default(0)->after('per_school_maintenance_fee_afn');
            
            // Index for billing period queries
            $table->index('billing_period');
        });

        // Migrate existing price_yearly_* to maintenance_fee_*
        // This preserves existing pricing as maintenance fees
        // License fees default to 0 for existing plans
        DB::statement('
            UPDATE subscription_plans 
            SET 
                maintenance_fee_afn = price_yearly_afn,
                maintenance_fee_usd = price_yearly_usd,
                per_school_maintenance_fee_afn = per_school_price_afn,
                per_school_maintenance_fee_usd = per_school_price_usd
            WHERE deleted_at IS NULL
        ');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subscription_plans', function (Blueprint $table) {
            $table->dropIndex(['billing_period']);
            
            $table->dropColumn([
                'billing_period',
                'custom_billing_days',
                'license_fee_afn',
                'license_fee_usd',
                'maintenance_fee_afn',
                'maintenance_fee_usd',
                'per_school_maintenance_fee_afn',
                'per_school_maintenance_fee_usd',
            ]);
        });
    }
};



