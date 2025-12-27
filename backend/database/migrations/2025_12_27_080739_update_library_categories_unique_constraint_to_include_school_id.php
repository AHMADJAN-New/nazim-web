<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Update the unique constraint on library_categories to include school_id.
     * This allows each school to have library categories with the same code.
     */
    public function up(): void
    {
        if (!Schema::hasTable('library_categories')) {
            return;
        }

        // Drop the old unique index
        DB::statement('DROP INDEX IF EXISTS public.idx_library_categories_unique_code_per_org');

        // Create the new unique index including school_id
        DB::statement("
            CREATE UNIQUE INDEX idx_library_categories_unique_code_per_school 
            ON public.library_categories (code, organization_id, school_id)
            WHERE deleted_at IS NULL AND code IS NOT NULL;
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('library_categories')) {
            return;
        }

        // Drop the new unique index
        DB::statement('DROP INDEX IF EXISTS public.idx_library_categories_unique_code_per_school');

        // Re-create the old unique index
        DB::statement("
            CREATE UNIQUE INDEX idx_library_categories_unique_code_per_org 
            ON public.library_categories (code, organization_id)
            WHERE deleted_at IS NULL AND code IS NOT NULL;
        ");
    }
};
