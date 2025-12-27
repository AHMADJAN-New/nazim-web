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
     * Update the unique constraint on finance_projects to include school_id.
     * This allows each school to have finance projects with the same code.
     */
    public function up(): void
    {
        if (!Schema::hasTable('finance_projects')) {
            return;
        }

        // Drop the old unique constraint
        DB::statement('ALTER TABLE public.finance_projects DROP CONSTRAINT IF EXISTS finance_projects_org_code_unique');

        // Add the new unique constraint including school_id (only if it doesn't exist)
        $constraintExists = DB::selectOne("SELECT 1 FROM pg_constraint WHERE conname = 'finance_projects_org_school_code_unique'");
        if (!$constraintExists) {
            Schema::table('finance_projects', function (Blueprint $table) {
                $table->unique(['organization_id', 'school_id', 'code'], 'finance_projects_org_school_code_unique');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('finance_projects')) {
            return;
        }

        // Drop the new unique constraint
        DB::statement('ALTER TABLE public.finance_projects DROP CONSTRAINT IF EXISTS finance_projects_org_school_code_unique');

        // Re-add the old unique constraint
        Schema::table('finance_projects', function (Blueprint $table) {
            $table->unique(['organization_id', 'code'], 'finance_projects_org_code_unique');
        });
    }
};
