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

        // Add school_id to asset-related tables that were still org-scoped
        $addSchoolId('asset_categories');
        $addSchoolId('asset_assignments');
        $addSchoolId('asset_histories');
        $addSchoolId('asset_maintenance_records');
        $addSchoolId('asset_copies');

        // Add school_id to attendance pivot table
        $addSchoolId('attendance_session_classes');

        // Backfill helper: choose earliest-created active school per organization
        $backfillByOrgDefaultSchool = function (string $table): void {
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

        // Backfill asset_* tables from assets.school_id when possible
        if (Schema::hasTable('assets') && Schema::hasColumn('assets', 'school_id')) {
            foreach (['asset_assignments', 'asset_histories', 'asset_maintenance_records', 'asset_copies'] as $table) {
                if (!Schema::hasTable($table) || !Schema::hasColumn($table, 'school_id') || !Schema::hasColumn($table, 'asset_id')) {
                    continue;
                }
                DB::statement(<<<SQL
UPDATE public.{$table} t
SET school_id = a.school_id
FROM public.assets a
WHERE t.school_id IS NULL
  AND t.asset_id = a.id
  AND a.school_id IS NOT NULL;
SQL);
                // Fallback (should be rare): fill remaining NULLs per org
                $backfillByOrgDefaultSchool($table);
            }
        }

        // Backfill asset_categories (no direct join): default per organization
        $backfillByOrgDefaultSchool('asset_categories');

        // Backfill attendance_session_classes from attendance_sessions.school_id
        if (Schema::hasTable('attendance_session_classes') && Schema::hasTable('attendance_sessions') && Schema::hasColumn('attendance_sessions', 'school_id')) {
            DB::statement(<<<SQL
UPDATE public.attendance_session_classes asc
SET school_id = s.school_id
FROM public.attendance_sessions s
WHERE asc.school_id IS NULL
  AND asc.attendance_session_id = s.id
  AND s.school_id IS NOT NULL;
SQL);
            $backfillByOrgDefaultSchool('attendance_session_classes');
        }

        // Backfill attendance_sessions.school_id from classes.school_id first, then org default
        if (Schema::hasTable('attendance_sessions') && Schema::hasColumn('attendance_sessions', 'school_id') && Schema::hasTable('classes') && Schema::hasColumn('classes', 'school_id')) {
            DB::statement(<<<SQL
UPDATE public.attendance_sessions s
SET school_id = c.school_id
FROM public.classes c
WHERE s.school_id IS NULL
  AND s.class_id = c.id
  AND c.school_id IS NOT NULL;
SQL);
            $backfillByOrgDefaultSchool('attendance_sessions');
        }

        // Backfill attendance_records.school_id from attendance_sessions.school_id
        if (Schema::hasTable('attendance_records') && Schema::hasColumn('attendance_records', 'school_id') && Schema::hasTable('attendance_sessions') && Schema::hasColumn('attendance_sessions', 'school_id')) {
            DB::statement(<<<SQL
UPDATE public.attendance_records r
SET school_id = s.school_id
FROM public.attendance_sessions s
WHERE r.school_id IS NULL
  AND r.attendance_session_id = s.id
  AND s.school_id IS NOT NULL;
SQL);
            $backfillByOrgDefaultSchool('attendance_records');
        }

        // Backfill leave_requests.school_id from students.school_id when possible
        if (Schema::hasTable('leave_requests') && Schema::hasColumn('leave_requests', 'school_id') && Schema::hasTable('students') && Schema::hasColumn('students', 'school_id')) {
            DB::statement(<<<SQL
UPDATE public.leave_requests lr
SET school_id = s.school_id
FROM public.students s
WHERE lr.school_id IS NULL
  AND lr.student_id = s.id
  AND s.school_id IS NOT NULL;
SQL);
            $backfillByOrgDefaultSchool('leave_requests');
        }

        // Backfill certificate_templates.school_id:
        // - if course_id is set, use short_term_courses.school_id
        // - otherwise use org default school
        if (Schema::hasTable('certificate_templates') && Schema::hasColumn('certificate_templates', 'school_id')) {
            if (Schema::hasColumn('certificate_templates', 'course_id') && Schema::hasTable('short_term_courses') && Schema::hasColumn('short_term_courses', 'school_id')) {
                DB::statement(<<<SQL
UPDATE public.certificate_templates ct
SET school_id = c.school_id
FROM public.short_term_courses c
WHERE ct.school_id IS NULL
  AND ct.course_id IS NOT NULL
  AND ct.course_id = c.id
  AND c.school_id IS NOT NULL;
SQL);
            }
            $backfillByOrgDefaultSchool('certificate_templates');
        }

        // Backfill id_card_templates.school_id by org default school
        $backfillByOrgDefaultSchool('id_card_templates');

        // Backfill assets.school_id by org default school (legacy nullable column)
        $backfillByOrgDefaultSchool('assets');

        // Update unique index for asset_categories.code to be school-scoped (drop old org-scoped index if present)
        if (Schema::hasTable('asset_categories')) {
            DB::statement('DROP INDEX IF EXISTS idx_asset_categories_unique_code_per_org');
            DB::statement(<<<SQL
CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_categories_unique_code_per_school
ON public.asset_categories (code, organization_id, school_id)
WHERE deleted_at IS NULL AND code IS NOT NULL;
SQL);
        }

        // Tighten school_id to NOT NULL when safe
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
            'assets',
            'asset_categories',
            'asset_assignments',
            'asset_histories',
            'asset_maintenance_records',
            'asset_copies',
            'attendance_sessions',
            'attendance_records',
            'attendance_session_classes',
            'leave_requests',
            'certificate_templates',
            'id_card_templates',
        ] as $table) {
            $setNotNullIfSafe($table);
        }
    }

    public function down(): void
    {
        // Non-trivial to safely drop constraints/indexes across environments; keep down() minimal.
    }
};

