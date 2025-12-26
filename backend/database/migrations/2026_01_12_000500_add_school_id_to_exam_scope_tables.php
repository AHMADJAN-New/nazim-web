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

        // Backfill school_id from parent exam (exams.school_id)
        $backfillFromExams = function (string $table): void {
            if (!Schema::hasTable($table) || !Schema::hasColumn($table, 'school_id') || !Schema::hasColumn($table, 'exam_id')) {
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

