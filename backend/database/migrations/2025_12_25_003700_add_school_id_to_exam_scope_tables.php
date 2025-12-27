<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
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

            DB::statement("ALTER TABLE public.{$table} ADD CONSTRAINT {$table}_school_id_fk FOREIGN KEY (school_id) REFERENCES public.school_branding(id) ON DELETE SET NULL");
        };

        foreach ([
            'exam_classes',
            'exam_subjects',
            'exam_times',
            'exam_students',
            'exam_results',
            'exam_attendances',
        ] as $table) {
            $addSchoolId($table);
        }

        // First, ensure exams.school_id is backfilled from academic_years.school_id
        // (in case it wasn't fully backfilled in earlier migration)
        if (Schema::hasTable('exams') && Schema::hasColumn('exams', 'school_id') && 
            Schema::hasColumn('exams', 'academic_year_id') && 
            Schema::hasTable('academic_years') && Schema::hasColumn('academic_years', 'school_id')) {
            DB::statement(<<<SQL
UPDATE public.exams e
SET school_id = ay.school_id
FROM public.academic_years ay
WHERE e.school_id IS NULL
  AND e.academic_year_id = ay.id
  AND ay.school_id IS NOT NULL;
SQL);
        }

        // Fallback: backfill remaining NULL exams.school_id from organization default school
        if (Schema::hasTable('exams') && Schema::hasColumn('exams', 'school_id') && 
            Schema::hasColumn('exams', 'organization_id')) {
            DB::statement(<<<SQL
WITH org_default_school AS (
  SELECT DISTINCT ON (organization_id)
    organization_id,
    id AS school_id
  FROM public.school_branding
  WHERE deleted_at IS NULL
  ORDER BY organization_id, created_at ASC
)
UPDATE public.exams e
SET school_id = ods.school_id
FROM org_default_school ods
WHERE e.school_id IS NULL
  AND e.organization_id IS NOT NULL
  AND e.organization_id = ods.organization_id;
SQL);
        }

        // Backfill school_id from parent exam (exams.school_id)
        $backfillFromExams = function (string $table): void {
            if (!Schema::hasTable($table) || !Schema::hasColumn($table, 'school_id') || !Schema::hasColumn($table, 'exam_id')) {
                return;
            }
            if (!Schema::hasTable('exams') || !Schema::hasColumn('exams', 'school_id')) {
                return;
            }

            DB::statement(<<<SQL
UPDATE public.{$table} t
SET school_id = e.school_id
FROM public.exams e
WHERE t.school_id IS NULL
  AND t.exam_id = e.id
  AND e.school_id IS NOT NULL;
SQL);
        };

        foreach ([
            'exam_classes',
            'exam_subjects',
            'exam_times',
            'exam_students',
            'exam_results',
            'exam_attendances',
        ] as $table) {
            $backfillFromExams($table);
        }

        // Fallback: backfill remaining NULL school_id in exam_* tables from organization default school
        // (in case exams.school_id was NULL and couldn't be backfilled)
        foreach ([
            'exam_classes',
            'exam_subjects',
            'exam_times',
            'exam_students',
            'exam_results',
            'exam_attendances',
        ] as $table) {
            if (!Schema::hasTable($table) || !Schema::hasColumn($table, 'school_id') || !Schema::hasColumn($table, 'exam_id')) {
                continue;
            }
            if (!Schema::hasTable('exams') || !Schema::hasColumn('exams', 'organization_id')) {
                continue;
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
FROM public.exams e
JOIN org_default_school ods ON e.organization_id = ods.organization_id
WHERE t.school_id IS NULL
  AND t.exam_id = e.id
  AND e.organization_id IS NOT NULL;
SQL);
        }

        // After backfill: make school_id NOT NULL when safe (no existing NULLs).
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
            'exam_classes',
            'exam_subjects',
            'exam_times',
            'exam_students',
            'exam_results',
            'exam_attendances',
        ] as $table) {
            $setNotNullIfSafe($table);
        }
    }

    public function down(): void
    {
        // Keep down() minimal; dropping constraints safely across environments is non-trivial.
    }
};

