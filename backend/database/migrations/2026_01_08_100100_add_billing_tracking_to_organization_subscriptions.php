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
     * Adds billing tracking fields to organization_subscriptions:
     * 
     * - license_paid_at: When the one-time license fee was paid
     * - license_payment_id: Reference to the payment record for license fee
     * - billing_period: Copied from plan at subscription creation
     * - next_maintenance_due_at: When the next maintenance fee is due
     * - last_maintenance_paid_at: When the last maintenance fee was paid
     */
    public function up(): void
    {
        Schema::table('organization_subscriptions', function (Blueprint $table) {
            // License fee tracking
            $table->timestamp('license_paid_at')->nullable()->after('amount_paid');
            $table->uuid('license_payment_id')->nullable()->after('license_paid_at');
            
            // Billing period (copied from plan)
            $table->string('billing_period', 20)->default('yearly')->after('license_payment_id');
            
            // Maintenance fee tracking
            $table->timestamp('next_maintenance_due_at')->nullable()->after('billing_period');
            $table->timestamp('last_maintenance_paid_at')->nullable()->after('next_maintenance_due_at');
            
            // Foreign key for license payment
            $table->foreign('license_payment_id')
                ->references('id')
                ->on('payment_records')
                ->onDelete('set null');
            
            // Indexes for querying
            $table->index('billing_period');
            $table->index('next_maintenance_due_at');
            $table->index('license_paid_at');
        });

        // For existing subscriptions:
        // - Set billing_period to 'yearly' (existing behavior)
        // - Calculate next_maintenance_due_at from expires_at (if active)
        // - For trial subscriptions, next_maintenance_due_at is null until activated
        DB::statement("
            UPDATE organization_subscriptions 
            SET 
                billing_period = 'yearly',
                next_maintenance_due_at = CASE 
                    WHEN status IN ('active', 'grace_period', 'readonly', 'pending_renewal') 
                         AND expires_at IS NOT NULL 
                    THEN expires_at
                    ELSE NULL
                END,
                last_maintenance_paid_at = CASE 
                    WHEN status IN ('active', 'grace_period', 'readonly', 'pending_renewal') 
                         AND started_at IS NOT NULL 
                    THEN started_at
                    ELSE NULL
                END
            WHERE deleted_at IS NULL
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('organization_subscriptions', function (Blueprint $table) {
            $table->dropForeign(['license_payment_id']);
            $table->dropIndex(['billing_period']);
            $table->dropIndex(['next_maintenance_due_at']);
            $table->dropIndex(['license_paid_at']);
            
            $table->dropColumn([
                'license_paid_at',
                'license_payment_id',
                'billing_period',
                'next_maintenance_due_at',
                'last_maintenance_paid_at',
            ]);
        });
    }
};

