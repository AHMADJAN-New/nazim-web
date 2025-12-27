<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Update the unique constraint for classes to be school-scoped
     * instead of organization-scoped. This allows each school to have
     * classes with the same code, rather than one per organization.
     */
    public function up(): void
    {
        if (!Schema::hasTable('classes')) {
            return;
        }

        // Drop the old organization-scoped unique constraint
        // Note: In PostgreSQL, unique constraints created via $table->unique() are constraints, not indexes
        DB::statement('ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS idx_classes_unique_code_per_org');

        // Create new school-scoped unique constraint
        // Class code must be unique per school (where deleted_at IS NULL)
        DB::statement(<<<SQL
CREATE UNIQUE INDEX IF NOT EXISTS idx_classes_unique_code_per_school
ON public.classes (code, organization_id, school_id)
WHERE deleted_at IS NULL;
SQL);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('classes')) {
            return;
        }

        // Drop the school-scoped constraint
        DB::statement('DROP INDEX IF EXISTS idx_classes_unique_code_per_school');

        // Restore the old organization-scoped constraint
        // Note: Using ALTER TABLE to create constraint (matches Laravel's $table->unique() behavior)
        DB::statement(<<<SQL
ALTER TABLE public.classes 
ADD CONSTRAINT idx_classes_unique_code_per_org 
UNIQUE (code, organization_id);
SQL);
    }
};
