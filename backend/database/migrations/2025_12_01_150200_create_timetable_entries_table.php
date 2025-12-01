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
        if (Schema::hasTable('timetable_entries')) {
            return;
        }

        // Check if required tables exist before creating foreign keys
        $organizationsExists = Schema::hasTable('organizations');
        $generatedTimetablesExists = Schema::hasTable('generated_timetables');
        $classAcademicYearsExists = Schema::hasTable('class_academic_years');
        $subjectsExists = Schema::hasTable('subjects');
        $staffExists = Schema::hasTable('staff');
        $scheduleSlotsExists = Schema::hasTable('schedule_slots');

        Schema::create('timetable_entries', function (Blueprint $table) use ($organizationsExists, $generatedTimetablesExists, $classAcademicYearsExists, $subjectsExists, $staffExists, $scheduleSlotsExists) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id')->nullable();
            $table->uuid('timetable_id');
            $table->uuid('class_academic_year_id');
            $table->uuid('subject_id');
            $table->uuid('teacher_id');
            $table->uuid('schedule_slot_id');
            $table->string('day_name'); // 'monday', 'tuesday', etc. or 'all_year'
            $table->integer('period_order'); // minutes from midnight for ordering
            $table->timestampTz('created_at')->default(DB::raw('NOW()'));
            $table->timestampTz('updated_at')->default(DB::raw('NOW()'));
            $table->timestampTz('deleted_at')->nullable();

            // Foreign keys - only create if referenced tables exist
            if ($organizationsExists) {
                $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            }
            if ($generatedTimetablesExists) {
                $table->foreign('timetable_id')->references('id')->on('generated_timetables')->onDelete('cascade');
            }
            if ($classAcademicYearsExists) {
                $table->foreign('class_academic_year_id')->references('id')->on('class_academic_years')->onDelete('cascade');
            }
            if ($subjectsExists) {
                $table->foreign('subject_id')->references('id')->on('subjects')->onDelete('cascade');
            }
            if ($staffExists) {
                $table->foreign('teacher_id')->references('id')->on('staff')->onDelete('cascade');
            }
            if ($scheduleSlotsExists) {
                $table->foreign('schedule_slot_id')->references('id')->on('schedule_slots')->onDelete('cascade');
            }

            // Indexes for performance
            $table->index('organization_id');
            $table->index('timetable_id');
            $table->index('class_academic_year_id');
            $table->index('subject_id');
            $table->index('teacher_id');
            $table->index('schedule_slot_id');
            $table->index('day_name');
            $table->index('period_order');
            $table->index('deleted_at');
        });

        // Check constraint for day_name
        DB::statement("ALTER TABLE timetable_entries ADD CONSTRAINT timetable_entries_day_name_check CHECK (day_name IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'all_year'))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('timetable_entries');
    }
};

