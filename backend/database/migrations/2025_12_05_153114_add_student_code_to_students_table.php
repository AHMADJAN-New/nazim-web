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
        Schema::table('students', function (Blueprint $table) {
            // Add student_code column (nullable initially for existing records)
            $table->string('student_code', 32)->nullable()->after('admission_no');
        });

        // Create unique partial index for student_code per organization (only for non-null values)
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS idx_students_unique_code_per_org ON students (student_code, organization_id) WHERE student_code IS NOT NULL AND deleted_at IS NULL');
        
        // Create index for student_code for faster lookups
        DB::statement('CREATE INDEX IF NOT EXISTS idx_students_student_code ON students (student_code) WHERE student_code IS NOT NULL');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            // Drop index first
            DB::statement('DROP INDEX IF EXISTS idx_students_unique_code_per_org');
            DB::statement('DROP INDEX IF EXISTS idx_students_student_code');
            
            // Drop column
            $table->dropColumn('student_code');
        });
    }
};
