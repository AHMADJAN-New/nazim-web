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
     * Exchange Rates - Currency conversion rates
     * Stores historical exchange rates for currency conversion
     * Rates are organization-scoped
     */
    public function up(): void
    {
        Schema::create('exchange_rates', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('from_currency_id'); // Source currency
            $table->uuid('to_currency_id'); // Target currency
            $table->decimal('rate', 15, 6); // Exchange rate (1 from_currency = rate to_currency)
            $table->date('effective_date'); // When this rate becomes effective
            $table->text('notes')->nullable(); // Optional notes about the rate
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            // Foreign keys
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('from_currency_id')->references('id')->on('currencies')->onDelete('cascade');
            $table->foreign('to_currency_id')->references('id')->on('currencies')->onDelete('cascade');

            // Indexes
            $table->index('organization_id');
            $table->index('from_currency_id');
            $table->index('to_currency_id');
            $table->index('effective_date');
            $table->index('is_active');
            $table->unique(['organization_id', 'from_currency_id', 'to_currency_id', 'effective_date'], 'exchange_rates_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exchange_rates');
    }
};
