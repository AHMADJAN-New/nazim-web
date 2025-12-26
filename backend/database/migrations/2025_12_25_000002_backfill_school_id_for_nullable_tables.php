<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        /**
         * Backfill helper:
         * - Uses the earliest created active school_branding per organization as the default school.
         * - Fills NULL school_id values for organization-scoped rows.
         * - Sets NOT NULL when safe (no remaining NULLs).
         */
        $backfillSchoolId = function (string $table): void {
            if (!Schema::hasTable($table) || !Schema::hasColumn($table, 'school_id') || !Schema::hasColumn($table, 'organization_id')) {
                return;
            }

            DB::statement(<<<SQL
WITH org_default_school AS (
  SELECT DISTINCT ON (organization_id) organization_id, id AS school_id
  FROM public.school_branding
  WHERE deleted_at IS NULL
  ORDER BY organization_id, created_at ASC
)
UPDATE public.{$table} t
SET school_id = ods.school_id
FROM org_default_school ods
WHERE t.school_id IS NULL
  AND t.organization_id IS NOT NULL
  AND t.organization_id = ods.organization_id
SQL);

            // Set NOT NULL only if safe.
            $nullCount = DB::table($table)->whereNull('school_id')->count();
            if ($nullCount === 0) {
                DB::statement("ALTER TABLE public.{$table} ALTER COLUMN school_id SET NOT NULL");
            }
        };

        // ------------------------------------------------------------------
        // DMS tables (created with nullable school_id)
        // ------------------------------------------------------------------
        foreach ([
            'departments',
            'document_sequences',
            'document_settings',
            'incoming_documents',
            'outgoing_documents',
            'document_links',
            'document_files',
            'letter_templates',
            'letterheads',
            'letter_types',
            'document_audit_logs',
        ] as $table) {
            $backfillSchoolId($table);
        }

        // ------------------------------------------------------------------
        // Finance tables (some were created with nullable school_id historically)
        // ------------------------------------------------------------------
        foreach ([
            'finance_accounts',
            'income_categories',
            'expense_categories',
            'finance_projects',
            'income_entries',
            'expense_entries',
        ] as $table) {
            $backfillSchoolId($table);
        }

        // ------------------------------------------------------------------
        // Timetable tables
        // timetable_entries was created without school_id; add + backfill.
        // ------------------------------------------------------------------
        if (Schema::hasTable('timetable_entries') && !Schema::hasColumn('timetable_entries', 'school_id')) {
            Schema::table('timetable_entries', function (Blueprint $table) {
                $table->uuid('school_id')->nullable()->index();
            });

            // FK (use CASCADE to avoid orphaned school-scoped data)
            DB::statement('ALTER TABLE public.timetable_entries ADD CONSTRAINT timetable_entries_school_id_fk FOREIGN KEY (school_id) REFERENCES public.school_branding(id) ON DELETE CASCADE');
        }

        if (Schema::hasTable('timetable_entries') && Schema::hasColumn('timetable_entries', 'school_id')) {
            // Backfill from the parent generated_timetables.school_id
            DB::statement(<<<SQL
UPDATE public.timetable_entries te
SET school_id = gt.school_id
FROM public.generated_timetables gt
WHERE te.school_id IS NULL
  AND te.timetable_id = gt.id
  AND gt.school_id IS NOT NULL
SQL);

            $nullCount = DB::table('timetable_entries')->whereNull('school_id')->count();
            if ($nullCount === 0) {
                DB::statement('ALTER TABLE public.timetable_entries ALTER COLUMN school_id SET NOT NULL');
            }
        }

        // teacher_timetable_preferences was created without school_id; add + backfill from teacher's school_id.
        if (Schema::hasTable('teacher_timetable_preferences') && !Schema::hasColumn('teacher_timetable_preferences', 'school_id')) {
            Schema::table('teacher_timetable_preferences', function (Blueprint $table) {
                $table->uuid('school_id')->nullable()->index();
            });
            DB::statement('ALTER TABLE public.teacher_timetable_preferences ADD CONSTRAINT teacher_timetable_prefs_school_id_fk FOREIGN KEY (school_id) REFERENCES public.school_branding(id) ON DELETE CASCADE');
        }

        if (Schema::hasTable('teacher_timetable_preferences') && Schema::hasColumn('teacher_timetable_preferences', 'school_id')) {
            DB::statement(<<<SQL
UPDATE public.teacher_timetable_preferences ttp
SET school_id = s.school_id
FROM public.staff s
WHERE ttp.school_id IS NULL
  AND ttp.teacher_id = s.id
  AND s.school_id IS NOT NULL
SQL);

            $nullCount = DB::table('teacher_timetable_preferences')->whereNull('school_id')->count();
            if ($nullCount === 0) {
                DB::statement('ALTER TABLE public.teacher_timetable_preferences ALTER COLUMN school_id SET NOT NULL');
            }
        }

        // ------------------------------------------------------------------
        // Tighten letter_types uniqueness to be school-scoped if possible.
        // (Once school_id is not null, uniqueness must include school_id.)
        // ------------------------------------------------------------------
        if (Schema::hasTable('letter_types') && Schema::hasColumn('letter_types', 'school_id')) {
            $nullCount = DB::table('letter_types')->whereNull('school_id')->count();
            if ($nullCount === 0) {
                // Drop old org-only unique constraint if it exists (Laravel default name).
                // This is safe to run on PostgreSQL when the constraint exists; it will error if missing,
                // so we guard by checking pg_constraint.
                $hasOldUnique = DB::selectOne(<<<SQL
SELECT 1
FROM pg_constraint
WHERE conname = 'letter_types_organization_id_key_unique'
LIMIT 1
SQL);
                if ($hasOldUnique) {
                    DB::statement('ALTER TABLE public.letter_types DROP CONSTRAINT letter_types_organization_id_key_unique');
                }

                // Create new school-scoped unique constraint if missing
                $hasNewUnique = DB::selectOne(<<<SQL
SELECT 1
FROM pg_constraint
WHERE conname = 'letter_types_org_school_key_unique'
LIMIT 1
SQL);
                if (!$hasNewUnique) {
                    DB::statement('ALTER TABLE public.letter_types ADD CONSTRAINT letter_types_org_school_key_unique UNIQUE (organization_id, school_id, key)');
                }
            }
        }
    }

    public function down(): void
    {
        // Non-destructive down: do not drop NOT NULL constraints or FKs automatically.
        // (This migration is a security hardening + data backfill.)
    }
};

