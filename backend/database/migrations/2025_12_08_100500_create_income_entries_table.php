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
     * Income Entries - Record all income (donations, sales, etc.)
     * Replaces "fees" completely for madrasah context
     */
    public function up(): void
    {
        Schema::create('income_entries', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id')->nullable();
            $table->uuid('account_id'); // Where money physically went
            $table->uuid('income_category_id');
            $table->uuid('project_id')->nullable(); // Optional: link to project
            $table->uuid('donor_id')->nullable(); // Optional: link to donor
            $table->decimal('amount', 15, 2);
            $table->date('date');
            $table->string('reference_no', 100)->nullable(); // Receipt number, etc.
            $table->text('description')->nullable(); // e.g., "Cash donation after Jumu'ah"
            $table->uuid('received_by_user_id')->nullable(); // Who received the money
            $table->enum('payment_method', ['cash', 'bank_transfer', 'cheque', 'other'])->default('cash');
            $table->timestamps();
            $table->softDeletes();

            // Foreign keys
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');
            $table->foreign('account_id')->references('id')->on('finance_accounts')->onDelete('restrict');
            $table->foreign('income_category_id')->references('id')->on('income_categories')->onDelete('restrict');
            $table->foreign('project_id')->references('id')->on('finance_projects')->onDelete('set null');
            $table->foreign('donor_id')->references('id')->on('donors')->onDelete('set null');
            $table->foreign('received_by_user_id')->references('id')->on('users')->onDelete('set null');

            // Indexes
            $table->index('organization_id');
            $table->index('school_id');
            $table->index('account_id');
            $table->index('income_category_id');
            $table->index('project_id');
            $table->index('donor_id');
            $table->index('date');
            $table->index('reference_no');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('income_entries');
    }
};
