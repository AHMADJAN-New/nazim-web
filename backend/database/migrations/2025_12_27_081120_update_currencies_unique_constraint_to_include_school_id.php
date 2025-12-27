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
     * Update the unique constraint on currencies to include school_id.
     * This allows each school to have currencies with the same code.
     */
    public function up(): void
    {
        if (!Schema::hasTable('currencies')) {
            return;
        }

        // Drop the old unique constraint
        DB::statement('ALTER TABLE public.currencies DROP CONSTRAINT IF EXISTS currencies_org_code_unique');

        // Add the new unique constraint including school_id
        Schema::table('currencies', function (Blueprint $table) {
            $table->unique(['organization_id', 'school_id', 'code'], 'currencies_org_school_code_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('currencies')) {
            return;
        }

        // Drop the new unique constraint
        DB::statement('ALTER TABLE public.currencies DROP CONSTRAINT IF EXISTS currencies_org_school_code_unique');

        // Re-add the old unique constraint
        Schema::table('currencies', function (Blueprint $table) {
            $table->unique(['organization_id', 'code'], 'currencies_org_code_unique');
        });
    }
};
