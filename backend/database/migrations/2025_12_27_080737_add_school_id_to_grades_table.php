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
     * Add school_id to grades table and backfill from organization default school
     */
    public function up(): void
    {
        if (!Schema::hasTable('grades')) {
            return;
        }

        if (Schema::hasColumn('grades', 'school_id')) {
            return;
        }

        // Add school_id column (nullable first)
        Schema::table('grades', function (Blueprint $table) {
            $table->uuid('school_id')->nullable()->index();
        });

        // Add foreign key
        DB::statement('ALTER TABLE public.grades ADD CONSTRAINT grades_school_id_fk FOREIGN KEY (school_id) REFERENCES public.school_branding(id) ON DELETE CASCADE');

        // Backfill school_id from organization default school
        if (Schema::hasColumn('grades', 'organization_id')) {
            DB::statement(<<<SQL
WITH org_default_school AS (
  SELECT DISTINCT ON (organization_id)
    organization_id,
    id AS school_id
  FROM public.school_branding
  WHERE deleted_at IS NULL
  ORDER BY organization_id, created_at ASC
)
UPDATE public.grades g
SET school_id = ods.school_id
FROM org_default_school ods
WHERE g.school_id IS NULL
  AND g.organization_id IS NOT NULL
  AND g.organization_id = ods.organization_id;
SQL);
        }

        // Set NOT NULL after backfill (if safe)
        $nullCount = DB::table('grades')->whereNull('school_id')->count();
        if ($nullCount === 0) {
            DB::statement('ALTER TABLE public.grades ALTER COLUMN school_id SET NOT NULL');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('grades') || !Schema::hasColumn('grades', 'school_id')) {
            return;
        }

        // Drop foreign key constraint
        DB::statement('ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS grades_school_id_fk');

        // Drop column
        Schema::table('grades', function (Blueprint $table) {
            $table->dropColumn('school_id');
        });
    }
};
