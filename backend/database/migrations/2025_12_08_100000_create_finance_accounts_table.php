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
     * Finance Accounts - Cash locations (not bank accounts)
     * Examples: "Main Cash Box", "Hostel Cash", "Principal's Cash", "Construction Project Cash"
     */
    public function up(): void
    {
        Schema::create('finance_accounts', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id')->nullable(); // Optional: school-level account
            $table->string('name', 255);
            $table->string('code', 50)->nullable(); // Optional code for quick reference
            $table->enum('type', ['cash', 'fund'])->default('cash');
            $table->text('description')->nullable();
            $table->decimal('opening_balance', 15, 2)->default(0);
            $table->decimal('current_balance', 15, 2)->default(0); // Denormalized, auto-updated
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
            $table->unique(['organization_id', 'code'], 'finance_accounts_org_code_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('finance_accounts');
    }
};
