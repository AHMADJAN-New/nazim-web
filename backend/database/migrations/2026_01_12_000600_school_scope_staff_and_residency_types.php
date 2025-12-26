<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add school_id to staff_types / residency_types (now strictly school-scoped).
        $addSchoolId = function (string $table): void {
            if (!Schema::hasTable($table) || Schema::hasColumn($table, 'school_id')) {
                return;
            }

            Schema::table($table, function (Blueprint $t): void {
                $t->uuid('school_id')->nullable()->index();
            });

            DB::statement("ALTER TABLE public.{$table} ADD CONSTRAINT {$table}_school_id_fk FOREIGN KEY (school_id) REFERENCES public.school_branding(id) ON DELETE SET NULL");
        };

        $addSchoolId('staff_types');
        $addSchoolId('residency_types');

        // Per organization: choose earliest created active school_branding as default.
        // 1) Duplicate global lookup rows (organization_id IS NULL) into each org's default school.
        // 2) Backfill missing school_id for org rows.
        // 3) Soft-delete remaining global rows.

        // ----------------------------
        // staff_types
        // ----------------------------
        if (Schema::hasTable('staff_types') && Schema::hasColumn('staff_types', 'school_id')) {
            DB::statement(<<<SQL
WITH org_default_school AS (
  SELECT DISTINCT ON (organization_id)
    organization_id,
    id AS school_id
  FROM public.school_branding
  WHERE deleted_at IS NULL
  ORDER BY organization_id, created_at ASC
)
INSERT INTO public.staff_types (
  id,
  organization_id,
  school_id,
  name,
  code,
  description,
  is_active,
  display_order,
  created_at,
  updated_at,
  deleted_at
)
SELECT
  gen_random_uuid(),
  ods.organization_id,
  ods.school_id,
  st.name,
  st.code,
  st.description,
  st.is_active,
  st.display_order,
  COALESCE(st.created_at, now()),
  now(),
  NULL
FROM public.staff_types st
CROSS JOIN org_default_school ods
WHERE st.organization_id IS NULL
  AND st.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.staff_types existing
    WHERE existing.deleted_at IS NULL
      AND existing.organization_id = ods.organization_id
      AND existing.school_id = ods.school_id
      AND existing.code = st.code
  );
SQL);

            // Backfill missing school_id on org rows
            DB::statement(<<<SQL
WITH org_default_school AS (
  SELECT DISTINCT ON (organization_id)
    organization_id,
    id AS school_id
  FROM public.school_branding
  WHERE deleted_at IS NULL
  ORDER BY organization_id, created_at ASC
)
UPDATE public.staff_types st
SET school_id = ods.school_id
FROM org_default_school ods
WHERE st.school_id IS NULL
  AND st.organization_id IS NOT NULL
  AND st.organization_id = ods.organization_id;
SQL);

            // Soft-delete global rows (no longer used)
            DB::statement("UPDATE public.staff_types SET deleted_at = now() WHERE organization_id IS NULL AND deleted_at IS NULL");

            // Tighten NOT NULL when safe (ignore soft-deleted rows)
            $activeNullOrg = (int) DB::table('staff_types')->whereNull('organization_id')->whereNull('deleted_at')->count();
            if ($activeNullOrg === 0) {
                DB::statement('ALTER TABLE public.staff_types ALTER COLUMN organization_id SET NOT NULL');
            }

            $activeNullSchool = (int) DB::table('staff_types')->whereNull('school_id')->whereNull('deleted_at')->count();
            if ($activeNullSchool === 0) {
                DB::statement('ALTER TABLE public.staff_types ALTER COLUMN school_id SET NOT NULL');
            }

            // Update unique index to be school-scoped
            DB::statement('DROP INDEX IF EXISTS idx_staff_types_unique_code_per_org');
            DB::statement(<<<SQL
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_types_unique_code_per_school
ON public.staff_types (code, organization_id, school_id)
WHERE deleted_at IS NULL;
SQL);
        }

        // ----------------------------
        // residency_types
        // ----------------------------
        if (Schema::hasTable('residency_types') && Schema::hasColumn('residency_types', 'school_id')) {
            DB::statement(<<<SQL
WITH org_default_school AS (
  SELECT DISTINCT ON (organization_id)
    organization_id,
    id AS school_id
  FROM public.school_branding
  WHERE deleted_at IS NULL
  ORDER BY organization_id, created_at ASC
)
INSERT INTO public.residency_types (
  id,
  organization_id,
  school_id,
  name,
  code,
  description,
  is_active,
  created_at,
  updated_at,
  deleted_at
)
SELECT
  gen_random_uuid(),
  ods.organization_id,
  ods.school_id,
  rt.name,
  rt.code,
  rt.description,
  rt.is_active,
  COALESCE(rt.created_at, now()),
  now(),
  NULL
FROM public.residency_types rt
CROSS JOIN org_default_school ods
WHERE rt.organization_id IS NULL
  AND rt.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.residency_types existing
    WHERE existing.deleted_at IS NULL
      AND existing.organization_id = ods.organization_id
      AND existing.school_id = ods.school_id
      AND existing.code = rt.code
  );
SQL);

            // Backfill missing school_id on org rows
            DB::statement(<<<SQL
WITH org_default_school AS (
  SELECT DISTINCT ON (organization_id)
    organization_id,
    id AS school_id
  FROM public.school_branding
  WHERE deleted_at IS NULL
  ORDER BY organization_id, created_at ASC
)
UPDATE public.residency_types rt
SET school_id = ods.school_id
FROM org_default_school ods
WHERE rt.school_id IS NULL
  AND rt.organization_id IS NOT NULL
  AND rt.organization_id = ods.organization_id;
SQL);

            // Soft-delete global rows (no longer used)
            DB::statement("UPDATE public.residency_types SET deleted_at = now() WHERE organization_id IS NULL AND deleted_at IS NULL");

            // Tighten NOT NULL when safe (ignore soft-deleted rows)
            $activeNullOrg = (int) DB::table('residency_types')->whereNull('organization_id')->whereNull('deleted_at')->count();
            if ($activeNullOrg === 0) {
                DB::statement('ALTER TABLE public.residency_types ALTER COLUMN organization_id SET NOT NULL');
            }

            $activeNullSchool = (int) DB::table('residency_types')->whereNull('school_id')->whereNull('deleted_at')->count();
            if ($activeNullSchool === 0) {
                DB::statement('ALTER TABLE public.residency_types ALTER COLUMN school_id SET NOT NULL');
            }

            // Update unique index to be school-scoped
            DB::statement('DROP INDEX IF EXISTS idx_residency_types_unique_code_per_org');
            DB::statement(<<<SQL
CREATE UNIQUE INDEX IF NOT EXISTS idx_residency_types_unique_code_per_school
ON public.residency_types (code, organization_id, school_id)
WHERE deleted_at IS NULL;
SQL);
        }
    }

    public function down(): void
    {
        // Non-destructive down (security hardening + data migration).
    }
};

