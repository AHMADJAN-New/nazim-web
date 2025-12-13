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
     * Currencies - Multi-currency support for finance module
     * Each organization can have multiple currencies
     * One currency per organization is marked as base currency
     */
    public function up(): void
    {
        Schema::create('currencies', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->string('code', 3); // ISO 4217 code (USD, AFN, PKR, etc.)
            $table->string('name', 100); // Full name (US Dollar, Afghan Afghani, etc.)
            $table->string('symbol', 10)->nullable(); // Symbol ($, ؋, Rs, etc.)
            $table->integer('decimal_places')->default(2); // Decimal places for display
            $table->boolean('is_base')->default(false); // Base currency for organization
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            // Foreign keys
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');

            // Indexes
            $table->index('organization_id');
            $table->index('is_base');
            $table->index('is_active');
            $table->unique(['organization_id', 'code'], 'currencies_org_code_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('currencies');
    }
};
