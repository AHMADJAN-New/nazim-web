<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Add school_id to exams table and backfill from academic_years.school_id
     */
    public function up(): void
    {
        if (!Schema::hasTable('exams')) {
            return;
        }

        if (Schema::hasColumn('exams', 'school_id')) {
            return;
        }

        // Add school_id column (nullable first)
        Schema::table('exams', function (Blueprint $table) {
            $table->uuid('school_id')->nullable()->index();
        });

        // Add foreign key
        DB::statement('ALTER TABLE public.exams ADD CONSTRAINT exams_school_id_fk FOREIGN KEY (school_id) REFERENCES public.school_branding(id) ON DELETE CASCADE');

        // Backfill school_id from academic_years.school_id
        if (Schema::hasTable('academic_years') && Schema::hasColumn('academic_years', 'school_id')) {
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
        if (Schema::hasColumn('exams', 'organization_id')) {
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

        // Set NOT NULL after backfill (if safe)
        $nullCount = DB::table('exams')->whereNull('school_id')->count();
        if ($nullCount === 0) {
            DB::statement('ALTER TABLE public.exams ALTER COLUMN school_id SET NOT NULL');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('exams') || !Schema::hasColumn('exams', 'school_id')) {
            return;
        }

        // Drop foreign key constraint
        DB::statement('ALTER TABLE public.exams DROP CONSTRAINT IF EXISTS exams_school_id_fk');

        // Drop column
        Schema::table('exams', function (Blueprint $table) {
            $table->dropColumn('school_id');
        });
    }
};
