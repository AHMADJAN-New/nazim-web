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
        // Check if course_students table exists
        $courseStudentsExists = Schema::hasTable('course_students');

        Schema::table('student_id_cards', function (Blueprint $table) use ($courseStudentsExists) {
            // Add nullable course_student_id column
            $table->uuid('course_student_id')->nullable()->after('student_admission_id');
            
            // Add foreign key if course_students table exists
            if ($courseStudentsExists) {
                $table->foreign('course_student_id')
                    ->references('id')
                    ->on('course_students')
                    ->onDelete('cascade');
            }
            
            // Add index for performance
            $table->index('course_student_id');
        });

        // Update unique constraint for regular students (exclude course students)
        DB::statement("
            DROP INDEX IF EXISTS idx_student_id_cards_unique_admission_year;
        ");
        
        DB::statement("
            CREATE UNIQUE INDEX idx_student_id_cards_unique_admission_year 
            ON public.student_id_cards (student_admission_id, academic_year_id)
            WHERE deleted_at IS NULL AND course_student_id IS NULL;
        ");

        // Create new unique constraint for course students
        DB::statement("
            CREATE UNIQUE INDEX IF NOT EXISTS idx_student_id_cards_unique_course_student_year 
            ON public.student_id_cards (course_student_id, academic_year_id)
            WHERE deleted_at IS NULL AND course_student_id IS NOT NULL;
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop unique constraints
        DB::statement("
            DROP INDEX IF EXISTS idx_student_id_cards_unique_course_student_year;
        ");
        
        DB::statement("
            DROP INDEX IF EXISTS idx_student_id_cards_unique_admission_year;
        ");

        Schema::table('student_id_cards', function (Blueprint $table) {
            // Drop foreign key constraint first
            $table->dropForeign(['course_student_id']);
            // Drop index
            $table->dropIndex(['course_student_id']);
            // Drop column
            $table->dropColumn('course_student_id');
        });

        // Restore original unique constraint
        DB::statement("
            CREATE UNIQUE INDEX idx_student_id_cards_unique_admission_year 
            ON public.student_id_cards (student_admission_id, academic_year_id)
            WHERE deleted_at IS NULL;
        ");
    }
};
