<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Update the unique constraint for current academic years to be school-scoped
     * instead of organization-scoped. This allows each school to have one current
     * academic year, rather than one per organization.
     */
    public function up(): void
    {
        if (!Schema::hasTable('academic_years')) {
            return;
        }

        // Drop the old organization-scoped unique constraint
        DB::statement('DROP INDEX IF EXISTS idx_academic_years_unique_current_per_org');

        // Create new school-scoped unique constraint
        // Only one current academic year per school (where is_current = true)
        DB::statement(<<<SQL
CREATE UNIQUE INDEX IF NOT EXISTS idx_academic_years_unique_current_per_school
ON public.academic_years (organization_id, school_id, is_current)
WHERE deleted_at IS NULL AND is_current = true;
SQL);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('academic_years')) {
            return;
        }

        // Drop the school-scoped constraint
        DB::statement('DROP INDEX IF EXISTS idx_academic_years_unique_current_per_school');

        // Restore the old organization-scoped constraint
        DB::statement(<<<SQL
CREATE UNIQUE INDEX IF NOT EXISTS idx_academic_years_unique_current_per_org
ON public.academic_years (organization_id, is_current)
WHERE deleted_at IS NULL AND is_current = true;
SQL);
    }
};
