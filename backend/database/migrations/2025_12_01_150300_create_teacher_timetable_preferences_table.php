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
        if (Schema::hasTable('teacher_timetable_preferences')) {
            return;
        }

        // Check if required tables exist before creating foreign keys
        $organizationsExists = Schema::hasTable('organizations');
        $academicYearsExists = Schema::hasTable('academic_years');
        $staffExists = Schema::hasTable('staff');

        Schema::create('teacher_timetable_preferences', function (Blueprint $table) use ($organizationsExists, $academicYearsExists, $staffExists) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id')->nullable();
            $table->uuid('academic_year_id')->nullable();
            $table->uuid('teacher_id');
            $table->json('schedule_slot_ids')->default('[]'); // JSONB array of schedule slot UUIDs
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
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
            if ($staffExists) {
                $table->foreign('teacher_id')->references('id')->on('staff')->onDelete('cascade');
            }

            // Indexes for performance
            $table->index('organization_id');
            $table->index('teacher_id');
            $table->index('academic_year_id');
            $table->index('is_active');
            $table->index('deleted_at');
        });

        // Convert JSON column to JSONB for better indexing support
        DB::statement('ALTER TABLE teacher_timetable_preferences ALTER COLUMN schedule_slot_ids TYPE jsonb USING schedule_slot_ids::jsonb');

        // Create GIN index for schedule_slot_ids JSONB column (PostgreSQL specific)
        DB::statement('CREATE INDEX IF NOT EXISTS idx_teacher_prefs_schedule_slot_ids ON teacher_timetable_preferences USING GIN (schedule_slot_ids)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('teacher_timetable_preferences');
    }
};

