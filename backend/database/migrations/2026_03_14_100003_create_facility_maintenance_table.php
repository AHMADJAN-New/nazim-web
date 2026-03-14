<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Maintenance log per facility; optional link to expense entry.
     */
    public function up(): void
    {
        Schema::create('facility_maintenance', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('facility_id');
            $table->date('maintained_at');
            $table->text('description')->nullable();
            $table->string('status', 50)->default('pending');
            $table->decimal('cost_amount', 15, 2)->nullable();
            $table->uuid('currency_id')->nullable();
            $table->uuid('expense_entry_id')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('facility_id')->references('id')->on('org_facilities')->onDelete('cascade');
            $table->foreign('currency_id')->references('id')->on('currencies')->onDelete('set null');
            $table->foreign('expense_entry_id')->references('id')->on('expense_entries')->onDelete('set null');

            $table->index('facility_id');
            $table->index('maintained_at');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('facility_maintenance');
    }
};
