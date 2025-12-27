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
     * Update the unique constraint on expense_categories to include school_id.
     * This allows each school to have expense categories with the same code.
     */
    public function up(): void
    {
        if (!Schema::hasTable('expense_categories')) {
            return;
        }

        // Drop the old unique constraint
        DB::statement('ALTER TABLE public.expense_categories DROP CONSTRAINT IF EXISTS expense_categories_org_code_unique');

        // Add the new unique constraint including school_id (only if it doesn't exist)
        $constraintExists = DB::selectOne("SELECT 1 FROM pg_constraint WHERE conname = 'expense_categories_org_school_code_unique'");
        if (!$constraintExists) {
            Schema::table('expense_categories', function (Blueprint $table) {
                $table->unique(['organization_id', 'school_id', 'code'], 'expense_categories_org_school_code_unique');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('expense_categories')) {
            return;
        }

        // Drop the new unique constraint
        DB::statement('ALTER TABLE public.expense_categories DROP CONSTRAINT IF EXISTS expense_categories_org_school_code_unique');

        // Re-add the old unique constraint
        Schema::table('expense_categories', function (Blueprint $table) {
            $table->unique(['organization_id', 'code'], 'expense_categories_org_code_unique');
        });
    }
};
