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
        // Skip if table already exists (created via Supabase migrations)
        if (Schema::hasTable('schedule_slots')) {
            return;
        }

        // Check if required tables exist before creating foreign keys
        $organizationsExists = Schema::hasTable('organizations');
        $academicYearsExists = Schema::hasTable('academic_years');
        $schoolBrandingExists = Schema::hasTable('school_branding');

        Schema::create('schedule_slots', function (Blueprint $table) use ($organizationsExists, $academicYearsExists, $schoolBrandingExists) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id')->nullable();
            $table->string('name', 100);
            $table->string('code', 50);
            $table->time('start_time');
            $table->time('end_time');
            $table->json('days_of_week')->default('[]'); // JSONB array of day names
            $table->integer('default_duration_minutes')->default(45);
            $table->uuid('academic_year_id')->nullable();
            $table->uuid('school_id')->nullable();
            $table->integer('sort_order')->default(1);
            $table->boolean('is_active')->default(true);
            $table->text('description')->nullable();
            $table->timestampTz('created_at')->default(DB::raw('NOW()'));
            $table->timestampTz('updated_at')->default(DB::raw('NOW()'));
            $table->timestampTz('deleted_at')->nullable();

            // Foreign keys - only create if referenced tables exist
            if ($organizationsExists) {
                $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            }
            if ($academicYearsExists) {
                $table->foreign('academic_year_id')->references('id')->on('academic_years')->onDelete('set null');
            }
            if ($schoolBrandingExists) {
                $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');
            }

            // Indexes for performance
            $table->index('organization_id');
            $table->index('academic_year_id');
            $table->index('school_id');
            $table->index('sort_order');
            $table->index('is_active');
            $table->index('deleted_at');
        });

        // Convert JSON column to JSONB for better indexing support
        DB::statement('ALTER TABLE schedule_slots ALTER COLUMN days_of_week TYPE jsonb USING days_of_week::jsonb');

        // Create GIN index for days_of_week JSONB column (PostgreSQL specific)
        DB::statement('CREATE INDEX IF NOT EXISTS idx_schedule_slots_days_of_week ON schedule_slots USING GIN (days_of_week)');

        // Unique constraint: code must be unique per organization, academic year, and school (where not deleted)
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_slots_unique_code ON schedule_slots(code, organization_id, academic_year_id, school_id) WHERE deleted_at IS NULL');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('schedule_slots');
    }
};

