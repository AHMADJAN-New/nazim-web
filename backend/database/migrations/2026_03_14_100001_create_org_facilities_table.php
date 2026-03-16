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
     * Org-level managed facilities (mosques, community centers, etc.).
     */
    public function up(): void
    {
        Schema::create('org_facilities', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('facility_type_id')->nullable();
            $table->string('name', 255);
            $table->text('address')->nullable();
            $table->uuid('finance_account_id')->nullable();
            $table->uuid('school_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('facility_type_id')->references('id')->on('facility_types')->onDelete('set null');
            $table->foreign('finance_account_id')->references('id')->on('finance_accounts')->onDelete('set null');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');

            $table->index('organization_id');
            $table->index('facility_type_id');
            $table->index('finance_account_id');
            $table->index('school_id');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('org_facilities');
    }
};
