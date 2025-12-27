<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * All non-permission resources are school-scoped.
     * This migration adds school_id to legacy org-scoped tables and backfills it.
     */
    public function up(): void
    {
        // Helper: add school_id column + FK + index if missing
        $addSchoolId = function (string $table): void {
            if (!Schema::hasTable($table)) {
                return;
            }
            if (Schema::hasColumn($table, 'school_id')) {
                return;
            }

            Schema::table($table, function (Blueprint $t): void {
                $t->uuid('school_id')->nullable()->index();
            });

            // FK is safe even if schools are soft-deleted (row remains).
            DB::statement("ALTER TABLE public.{$table} ADD CONSTRAINT {$table}_school_id_fk FOREIGN KEY (school_id) REFERENCES public.school_branding(id) ON DELETE SET NULL");
        };

        // Core academics (previously org-scoped)
        $addSchoolId('classes');
        $addSchoolId('subjects');
        $addSchoolId('academic_years');
        $addSchoolId('grades');
        $addSchoolId('exams');
        $addSchoolId('class_academic_years');
        $addSchoolId('class_subject_templates');
        $addSchoolId('class_subjects');

        // Library (previously org-scoped)
        $addSchoolId('library_books');
        $addSchoolId('library_categories');
        $addSchoolId('library_loans');
        $addSchoolId('library_copies');

        // Finance/support tables that were org-scoped but are now school-scoped
        $addSchoolId('currencies');
        $addSchoolId('exchange_rates');
        $addSchoolId('donors');

        // Short-term courses (previously org-scoped)
        $addSchoolId('short_term_courses');
        $addSchoolId('course_students');
        $addSchoolId('course_attendance_sessions');
        $addSchoolId('course_attendance_records');
        $addSchoolId('course_documents');

        // Backfill school_id for tables that have organization_id
        // Strategy: per organization, choose the earliest-created active school_branding as default.
        $backfillByOrg = function (string $table): void {
            if (!Schema::hasTable($table) || !Schema::hasColumn($table, 'school_id') || !Schema::hasColumn($table, 'organization_id')) {
                return;
            }

            DB::statement(<<<SQL
WITH org_default_school AS (
  SELECT DISTINCT ON (organization_id)
    organization_id,
    id AS school_id
  FROM public.school_branding
  WHERE deleted_at IS NULL
  ORDER BY organization_id, created_at ASC
)
UPDATE public.{$table} t
SET school_id = ods.school_id
FROM org_default_school ods
WHERE t.school_id IS NULL
  AND t.organization_id IS NOT NULL
  AND t.organization_id = ods.organization_id;
SQL);
        };

        foreach ([
            'classes',
            'subjects',
            'academic_years',
            'grades',
            'exams',
            'class_academic_years',
            'class_subject_templates',
            'class_subjects',
            'library_books',
            'library_categories',
            'library_loans',
            'currencies',
            'exchange_rates',
            'donors',
            'short_term_courses',
            'course_students',
            'course_attendance_sessions',
            'course_attendance_records',
            'course_documents',
        ] as $table) {
            $backfillByOrg($table);
        }

        // Backfill library_copies via book -> org/school if possible
        if (Schema::hasTable('library_copies') && Schema::hasColumn('library_copies', 'school_id') && Schema::hasColumn('library_copies', 'book_id') && Schema::hasColumn('library_books', 'school_id')) {
            DB::statement(<<<SQL
UPDATE public.library_copies c
SET school_id = b.school_id
FROM public.library_books b
WHERE c.school_id IS NULL
  AND c.book_id = b.id
  AND b.school_id IS NOT NULL;
SQL);
        }

        // After backfill: make school_id NOT NULL when safe (no existing NULLs).
        // These tables are now treated as school-scoped at the API layer.
        $setNotNullIfSafe = function (string $table): void {
            if (!Schema::hasTable($table) || !Schema::hasColumn($table, 'school_id')) {
                return;
            }
            $nullCount = (int) DB::table($table)->whereNull('school_id')->count();
            if ($nullCount === 0) {
                DB::statement("ALTER TABLE public.{$table} ALTER COLUMN school_id SET NOT NULL");
            }
        };

        foreach ([
            'classes',
            'subjects',
            'academic_years',
            'grades',
            'exams',
            'class_academic_years',
            'class_subject_templates',
            'class_subjects',
            'library_books',
            'library_categories',
            'library_loans',
            'library_copies',
            'currencies',
            'exchange_rates',
            'donors',
            'short_term_courses',
            'course_students',
            'course_attendance_sessions',
            'course_attendance_records',
            'course_documents',
        ] as $table) {
            $setNotNullIfSafe($table);
        }
    }

    public function down(): void
    {
        // Non-trivial to safely drop constraints across environments; keep down() minimal.
        // If needed, create a dedicated rollback migration.
    }
};

