<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('academic_years', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id')->nullable();
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->string('name', 100);
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_current')->default(false);
            $table->text('description')->nullable();
            $table->string('status', 50)->default('active');
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('organization_id');
            $table->index('is_current');
            $table->index('status');
            $table->index('deleted_at');
        });

        // Check constraint: end_date > start_date
        DB::statement('ALTER TABLE academic_years ADD CONSTRAINT academic_years_date_range CHECK (end_date > start_date)');

        // Unique partial index: Only one current year per organization
        // Note: Laravel doesn't support partial unique indexes directly, so we'll use a raw query
        DB::statement('CREATE UNIQUE INDEX idx_academic_years_unique_current_per_org ON academic_years (organization_id, is_current) WHERE deleted_at IS NULL AND is_current = true');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('academic_years');
    }
};
