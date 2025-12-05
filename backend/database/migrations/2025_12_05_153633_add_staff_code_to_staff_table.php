<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('staff', function (Blueprint $table) {
            // Add staff_code column (nullable initially for existing records)
            $table->string('staff_code', 32)->nullable()->after('employee_id');
        });

        // Create unique partial index for staff_code per organization (only for non-null values)
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_unique_code_per_org ON staff (staff_code, organization_id) WHERE staff_code IS NOT NULL AND deleted_at IS NULL');
        
        // Create index for staff_code for faster lookups
        DB::statement('CREATE INDEX IF NOT EXISTS idx_staff_staff_code ON staff (staff_code) WHERE staff_code IS NOT NULL');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('staff', function (Blueprint $table) {
            // Drop index first
            DB::statement('DROP INDEX IF EXISTS idx_staff_unique_code_per_org');
            DB::statement('DROP INDEX IF EXISTS idx_staff_staff_code');
            
            // Drop column
            $table->dropColumn('staff_code');
        });
    }
};
