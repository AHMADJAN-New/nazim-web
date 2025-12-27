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
     * Update the unique constraint on course_students to include school_id.
     * This allows each school to have course students with the same admission_no.
     */
    public function up(): void
    {
        if (!Schema::hasTable('course_students')) {
            return;
        }

        // Check if school_id column exists
        if (!Schema::hasColumn('course_students', 'school_id')) {
            // If school_id doesn't exist, this migration can't proceed
            // The column should be added in a previous migration
            return;
        }

        // Check if the new constraint already exists
        $constraintExists = DB::selectOne("
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'course_students_admission_no_org_school_unique'
            AND conrelid = 'public.course_students'::regclass
        ");

        if ($constraintExists) {
            // Constraint already exists, skip
            return;
        }

        // Drop the old unique constraint if it exists
        DB::statement('ALTER TABLE public.course_students DROP CONSTRAINT IF EXISTS course_students_admission_no_organization_id_unique');

        // Add the new unique constraint including school_id
        Schema::table('course_students', function (Blueprint $table) {
            $table->unique(['admission_no', 'organization_id', 'school_id'], 'course_students_admission_no_org_school_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('course_students')) {
            return;
        }

        // Drop the new unique constraint
        DB::statement('ALTER TABLE public.course_students DROP CONSTRAINT IF EXISTS course_students_admission_no_org_school_unique');

        // Re-add the old unique constraint
        Schema::table('course_students', function (Blueprint $table) {
            $table->unique(['admission_no', 'organization_id'], 'course_students_admission_no_organization_id_unique');
        });
    }
};
