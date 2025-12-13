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
     * Finance Projects/Funds - Track income/expenses by project
     * Examples: Monthly Food, Library Expansion, New Building, Ramadan Iftar Project
     */
    public function up(): void
    {
        Schema::create('finance_projects', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id')->nullable(); // Optional: school-specific project
            $table->string('name', 255);
            $table->string('code', 50)->nullable(); // e.g., FOOD, LIB_EXP, RAMADAN
            $table->text('description')->nullable();
            $table->decimal('budget_amount', 15, 2)->nullable(); // Optional target budget
            $table->decimal('total_income', 15, 2)->default(0); // Denormalized for reports
            $table->decimal('total_expense', 15, 2)->default(0); // Denormalized for reports
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->enum('status', ['planning', 'active', 'completed', 'cancelled'])->default('active');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            // Foreign keys
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');

            // Indexes
            $table->index('organization_id');
            $table->index('school_id');
            $table->index('is_active');
            $table->index('status');
            $table->unique(['organization_id', 'code'], 'finance_projects_org_code_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('finance_projects');
    }
};
