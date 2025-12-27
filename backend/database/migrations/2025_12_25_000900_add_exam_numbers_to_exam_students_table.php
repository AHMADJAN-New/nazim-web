<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Adds exam_roll_number and exam_secret_number columns to exam_students table.
     * These columns are used for:
     * - exam_roll_number: The number printed on roll slips and used in exam context
     * - exam_secret_number: The anonymized number used for OMR/marking and secret labels
     * 
     * Both are exam-scoped (not global student IDs).
     */
    public function up(): void
    {
        if (!Schema::hasTable('exam_students')) {
            return;
        }

        Schema::table('exam_students', function (Blueprint $table) {
            // Add exam_roll_number - the roll number assigned for this specific exam
            if (!Schema::hasColumn('exam_students', 'exam_roll_number')) {
                $table->string('exam_roll_number', 50)->nullable()->after('organization_id');
            }
            
            // Add exam_secret_number - the secret/anonymous number for OMR marking
            if (!Schema::hasColumn('exam_students', 'exam_secret_number')) {
                $table->string('exam_secret_number', 50)->nullable()->after('exam_roll_number');
            }
        });

        // Create indexes for fast lookups only if columns exist and indexes don't exist
        if (Schema::hasColumn('exam_students', 'exam_roll_number')) {
            $rollIndexExists = DB::selectOne("
                SELECT 1 FROM pg_indexes 
                WHERE tablename = 'exam_students' 
                AND indexname = 'idx_exam_students_roll_number'
            ");
            
            if (!$rollIndexExists) {
                Schema::table('exam_students', function (Blueprint $table) {
                    $table->index('exam_roll_number', 'idx_exam_students_roll_number');
                });
            }
        }

        if (Schema::hasColumn('exam_students', 'exam_secret_number')) {
            $secretIndexExists = DB::selectOne("
                SELECT 1 FROM pg_indexes 
                WHERE tablename = 'exam_students' 
                AND indexname = 'idx_exam_students_secret_number'
            ");
            
            if (!$secretIndexExists) {
                Schema::table('exam_students', function (Blueprint $table) {
                    $table->index('exam_secret_number', 'idx_exam_students_secret_number');
                });
            }
        }

        // Create partial unique indexes for uniqueness within exam scope
        // We can't use standard unique constraint because we need uniqueness only when value is not null
        // Using raw SQL for PostgreSQL partial unique indexes
        
        // Unique exam_roll_number per exam (when not null) - only if column exists
        if (Schema::hasColumn('exam_students', 'exam_roll_number')) {
            $uniqueRollIndexExists = DB::selectOne("
                SELECT 1 FROM pg_indexes 
                WHERE tablename = 'exam_students' 
                AND indexname = 'idx_exam_students_unique_roll_number'
            ");
            
            if (!$uniqueRollIndexExists) {
                DB::statement('
                    CREATE UNIQUE INDEX idx_exam_students_unique_roll_number 
                    ON exam_students (exam_id, exam_roll_number) 
                    WHERE exam_roll_number IS NOT NULL AND deleted_at IS NULL
                ');
            }
        }
        
        // Unique exam_secret_number per exam (when not null) - only if column exists
        if (Schema::hasColumn('exam_students', 'exam_secret_number')) {
            $uniqueSecretIndexExists = DB::selectOne("
                SELECT 1 FROM pg_indexes 
                WHERE tablename = 'exam_students' 
                AND indexname = 'idx_exam_students_unique_secret_number'
            ");
            
            if (!$uniqueSecretIndexExists) {
                DB::statement('
                    CREATE UNIQUE INDEX idx_exam_students_unique_secret_number 
                    ON exam_students (exam_id, exam_secret_number) 
                    WHERE exam_secret_number IS NOT NULL AND deleted_at IS NULL
                ');
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop partial unique indexes
        DB::statement('DROP INDEX IF EXISTS idx_exam_students_unique_roll_number');
        DB::statement('DROP INDEX IF EXISTS idx_exam_students_unique_secret_number');
        
        Schema::table('exam_students', function (Blueprint $table) {
            $table->dropIndex('idx_exam_students_roll_number');
            $table->dropIndex('idx_exam_students_secret_number');
            $table->dropColumn(['exam_roll_number', 'exam_secret_number']);
        });
    }
};
