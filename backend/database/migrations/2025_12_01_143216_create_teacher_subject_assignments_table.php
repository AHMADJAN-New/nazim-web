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
        if (Schema::hasTable('teacher_subject_assignments')) {
            return;
        }

        // Check if required tables exist before creating foreign keys
        $subjectsExists = Schema::hasTable('subjects');
        $staffExists = Schema::hasTable('staff');
        $classAcademicYearsExists = Schema::hasTable('class_academic_years');
        $organizationsExists = Schema::hasTable('organizations');
        $schoolBrandingExists = Schema::hasTable('school_branding');
        $academicYearsExists = Schema::hasTable('academic_years');

        Schema::create('teacher_subject_assignments', function (Blueprint $table) use ($subjectsExists, $staffExists, $classAcademicYearsExists, $organizationsExists, $schoolBrandingExists, $academicYearsExists) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id')->nullable();
            $table->uuid('teacher_id'); // References staff.id (not profiles.id)
            $table->uuid('class_academic_year_id');
            $table->uuid('subject_id');
            // Use JSONB for PostgreSQL (better for indexing)
            // Laravel doesn't have jsonb() method, so we'll add it after table creation
            $table->json('schedule_slot_ids')->default('[]'); // Array of schedule slot UUIDs
            $table->uuid('school_id')->nullable();
            $table->uuid('academic_year_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestampTz('created_at')->default(DB::raw('NOW()'));
            $table->timestampTz('updated_at')->default(DB::raw('NOW()'));
            $table->timestampTz('deleted_at')->nullable();

            // Foreign keys - only create if referenced tables exist
            if ($organizationsExists) {
                $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            }
            if ($staffExists) {
                $table->foreign('teacher_id')->references('id')->on('staff')->onDelete('cascade');
            }
            if ($classAcademicYearsExists) {
                $table->foreign('class_academic_year_id')->references('id')->on('class_academic_years')->onDelete('cascade');
            }
            if ($subjectsExists) {
                $table->foreign('subject_id')->references('id')->on('subjects')->onDelete('cascade');
            }
            if ($schoolBrandingExists) {
                $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');
            }
            if ($academicYearsExists) {
                $table->foreign('academic_year_id')->references('id')->on('academic_years')->onDelete('set null');
            }

            // Indexes for performance
            $table->index('organization_id');
            $table->index('teacher_id');
            $table->index('class_academic_year_id');
            $table->index('subject_id');
            $table->index('school_id');
            $table->index('academic_year_id');
            $table->index('is_active');
            $table->index('deleted_at');

            // Unique constraint: one assignment per teacher, class, and subject combination
            // Note: PostgreSQL doesn't support ->whereNull() on unique() in Laravel migrations
            // We'll create it with a raw SQL statement instead
        });

        // Convert JSON column to JSONB for better indexing support
        DB::statement('ALTER TABLE teacher_subject_assignments ALTER COLUMN schedule_slot_ids TYPE jsonb USING schedule_slot_ids::jsonb');

        // Create unique constraint with WHERE clause (PostgreSQL specific)
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_subject_assignments_unique ON teacher_subject_assignments (teacher_id, class_academic_year_id, subject_id) WHERE deleted_at IS NULL');

        // Composite index for common queries
        DB::statement('CREATE INDEX IF NOT EXISTS idx_teacher_subject_assignments_teacher_class_active ON teacher_subject_assignments (teacher_id, class_academic_year_id, is_active) WHERE deleted_at IS NULL');

        // Create GIN index for schedule_slot_ids JSONB column (PostgreSQL specific)
        DB::statement('CREATE INDEX IF NOT EXISTS idx_teacher_subject_assignments_schedule_slot_ids ON teacher_subject_assignments USING GIN (schedule_slot_ids)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('teacher_subject_assignments');
    }
};
