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
     * Income Categories - Types of income for madrasah
     * Examples: General Donations, Zakat, Sadaqah, Qurbani Project, Book Sales, etc.
     */
    public function up(): void
    {
        Schema::create('income_categories', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id')->nullable(); // Optional: school-specific category
            $table->string('name', 255);
            $table->string('code', 50)->nullable(); // e.g., GEN_DON, ZAKAT, SADAQAH
            $table->text('description')->nullable();
            $table->boolean('is_restricted')->default(false); // For Zakat/Waqf tracking
            $table->boolean('is_active')->default(true);
            $table->integer('display_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            // Foreign keys
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');

            // Indexes
            $table->index('organization_id');
            $table->index('school_id');
            $table->index('is_active');
            $table->unique(['organization_id', 'code'], 'income_categories_org_code_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('income_categories');
    }
};
