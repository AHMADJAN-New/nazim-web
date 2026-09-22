<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Safe rebuild for databases that already ran the original school-scoped 000100.
 * Fresh installs create the new schema via 000100; this migration is a no-op then.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Drop legacy academic-year absences table if present
        Schema::dropIfExists('student_academic_year_absences');

        // Drop old school-scoped settings/bands (no exam_id) so we can recreate
        if (Schema::hasTable('exam_absence_penalty_settings') && ! Schema::hasColumn('exam_absence_penalty_settings', 'exam_id')) {
            Schema::dropIfExists('exam_absence_penalty_bands');
            Schema::dropIfExists('exam_absence_penalty_settings');
        } elseif (Schema::hasTable('exam_absence_penalty_bands') && ! Schema::hasColumn('exam_absence_penalty_bands', 'exam_id')) {
            Schema::dropIfExists('exam_absence_penalty_bands');
        }

        $this->ensureSettingsTable();
        $this->ensureBandsTable();
        $this->ensureExamClassesTable();
        $this->ensureStudentAbsencesTable();
    }

    public function down(): void
    {
        // Irreversible rebuild — leave new schema in place
    }

    private function ensureSettingsTable(): void
    {
        if (Schema::hasTable('exam_absence_penalty_settings')) {
            return;
        }

        Schema::create('exam_absence_penalty_settings', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->uuid('school_id');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
            $table->uuid('exam_id');
            $table->foreign('exam_id')->references('id')->on('exams')->onDelete('cascade');
            $table->boolean('is_enabled')->default(false);
            $table->timestamps();

            $table->unique('exam_id', 'exam_absence_penalty_settings_exam_unique');
            $table->index('organization_id');
            $table->index('school_id');
            $table->index(['organization_id', 'school_id']);
        });
    }

    private function ensureBandsTable(): void
    {
        if (Schema::hasTable('exam_absence_penalty_bands') && Schema::hasColumn('exam_absence_penalty_bands', 'exam_id')) {
            return;
        }

        Schema::dropIfExists('exam_absence_penalty_bands');

        Schema::create('exam_absence_penalty_bands', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->uuid('school_id');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
            $table->uuid('exam_id');
            $table->foreign('exam_id')->references('id')->on('exams')->onDelete('cascade');
            $table->unsignedInteger('min_absences');
            $table->unsignedInteger('max_absences')->nullable();
            $table->decimal('marks_per_absence', 8, 2)->default(0);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index('organization_id');
            $table->index('school_id');
            $table->index('exam_id');
            $table->index(['exam_id', 'sort_order']);
        });

        $this->addCheckIfMissing('exam_absence_penalty_bands', 'exam_absence_penalty_bands_min_check', 'min_absences >= 0');
        $this->addCheckIfMissing('exam_absence_penalty_bands', 'exam_absence_penalty_bands_max_check', 'max_absences IS NULL OR max_absences >= min_absences');
        $this->addCheckIfMissing('exam_absence_penalty_bands', 'exam_absence_penalty_bands_marks_check', 'marks_per_absence >= 0');
    }

    private function ensureExamClassesTable(): void
    {
        if (Schema::hasTable('exam_absence_penalty_exam_classes')) {
            return;
        }

        Schema::create('exam_absence_penalty_exam_classes', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->uuid('school_id');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
            $table->uuid('exam_id');
            $table->foreign('exam_id')->references('id')->on('exams')->onDelete('cascade');
            $table->uuid('exam_class_id');
            $table->foreign('exam_class_id')->references('id')->on('exam_classes')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['exam_id', 'exam_class_id'], 'exam_absence_penalty_exam_class_unique');
            $table->index('organization_id');
            $table->index('school_id');
            $table->index('exam_id');
            $table->index('exam_class_id');
        });
    }

    private function ensureStudentAbsencesTable(): void
    {
        if (Schema::hasTable('exam_student_absences')) {
            return;
        }

        Schema::create('exam_student_absences', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->uuid('school_id');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
            $table->uuid('exam_id');
            $table->foreign('exam_id')->references('id')->on('exams')->onDelete('cascade');
            $table->uuid('student_admission_id');
            $table->foreign('student_admission_id')->references('id')->on('student_admissions')->onDelete('cascade');
            $table->unsignedInteger('absence_count')->default(0);
            $table->timestamps();

            $table->unique(['exam_id', 'student_admission_id'], 'exam_student_absences_exam_admission_unique');
            $table->index('organization_id');
            $table->index('school_id');
            $table->index('exam_id');
            $table->index('student_admission_id');
        });

        $this->addCheckIfMissing('exam_student_absences', 'exam_student_absences_count_check', 'absence_count >= 0');
    }

    private function addCheckIfMissing(string $table, string $constraint, string $expression): void
    {
        $exists = DB::selectOne(
            'SELECT 1 AS ok FROM pg_constraint WHERE conname = ?',
            [$constraint]
        );

        if ($exists) {
            return;
        }

        DB::statement("ALTER TABLE {$table} ADD CONSTRAINT {$constraint} CHECK ({$expression})");
    }
};
