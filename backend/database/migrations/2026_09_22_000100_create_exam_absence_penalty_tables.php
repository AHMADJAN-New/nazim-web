<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exam_absence_penalty_settings', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->uuid('school_id');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
            $table->boolean('is_enabled')->default(false);
            $table->timestamps();

            $table->unique(['organization_id', 'school_id'], 'exam_absence_penalty_settings_org_school_unique');
            $table->index('organization_id');
            $table->index('school_id');
        });

        Schema::create('exam_absence_penalty_bands', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->uuid('school_id');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
            $table->unsignedInteger('min_absences');
            $table->unsignedInteger('max_absences')->nullable();
            $table->decimal('marks_per_absence', 8, 2)->default(0);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index('organization_id');
            $table->index('school_id');
            $table->index(['organization_id', 'school_id', 'sort_order']);
        });

        DB::statement('ALTER TABLE exam_absence_penalty_bands ADD CONSTRAINT exam_absence_penalty_bands_min_check CHECK (min_absences >= 0)');
        DB::statement('ALTER TABLE exam_absence_penalty_bands ADD CONSTRAINT exam_absence_penalty_bands_max_check CHECK (max_absences IS NULL OR max_absences >= min_absences)');
        DB::statement('ALTER TABLE exam_absence_penalty_bands ADD CONSTRAINT exam_absence_penalty_bands_marks_check CHECK (marks_per_absence >= 0)');

        Schema::create('student_academic_year_absences', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->uuid('school_id');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
            $table->uuid('academic_year_id');
            $table->foreign('academic_year_id')->references('id')->on('academic_years')->onDelete('cascade');
            $table->uuid('student_admission_id');
            $table->foreign('student_admission_id')->references('id')->on('student_admissions')->onDelete('cascade');
            $table->unsignedInteger('absence_count')->default(0);
            $table->timestamps();

            $table->unique(
                ['school_id', 'academic_year_id', 'student_admission_id'],
                'student_ay_absences_school_year_admission_unique'
            );
            $table->index('organization_id');
            $table->index('school_id');
            $table->index('academic_year_id');
            $table->index('student_admission_id');
        });

        DB::statement('ALTER TABLE student_academic_year_absences ADD CONSTRAINT student_ay_absences_count_check CHECK (absence_count >= 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('student_academic_year_absences');
        Schema::dropIfExists('exam_absence_penalty_bands');
        Schema::dropIfExists('exam_absence_penalty_settings');
    }
};
