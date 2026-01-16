<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Add performance indexes for student history queries.
     * These indexes optimize queries that filter by student_id + organization_id + date columns.
     */
    public function up(): void
    {
        // Index for attendance records - student history queries
        DB::statement('CREATE INDEX IF NOT EXISTS idx_attendance_records_student_history 
            ON attendance_records(student_id, organization_id) 
            WHERE deleted_at IS NULL');

        // Index for exam results - student history queries
        DB::statement('CREATE INDEX IF NOT EXISTS idx_exam_results_student_history 
            ON exam_results(student_admission_id, organization_id) 
            WHERE deleted_at IS NULL');

        // Index for fee payments - student history queries
        DB::statement('CREATE INDEX IF NOT EXISTS idx_fee_payments_student_history 
            ON fee_payments(student_id, organization_id, payment_date) 
            WHERE deleted_at IS NULL');

        // Index for fee assignments - student history queries
        DB::statement('CREATE INDEX IF NOT EXISTS idx_fee_assignments_student_history 
            ON fee_assignments(student_id, organization_id) 
            WHERE deleted_at IS NULL');

        // Index for library loans - student history queries
        DB::statement('CREATE INDEX IF NOT EXISTS idx_library_loans_student_history 
            ON library_loans(student_id, organization_id, loan_date) 
            WHERE deleted_at IS NULL');

        // Index for student ID cards - student history queries
        DB::statement('CREATE INDEX IF NOT EXISTS idx_student_id_cards_student_history 
            ON student_id_cards(student_id, organization_id) 
            WHERE deleted_at IS NULL');

        // Index for course students - student history queries
        DB::statement('CREATE INDEX IF NOT EXISTS idx_course_students_main_student_history 
            ON course_students(main_student_id, organization_id) 
            WHERE deleted_at IS NULL');

        // Index for exam students - student history queries
        DB::statement('CREATE INDEX IF NOT EXISTS idx_exam_students_admission_history 
            ON exam_students(student_admission_id, organization_id) 
            WHERE deleted_at IS NULL');

        // Index for student admissions - student history queries (composite for better performance)
        DB::statement('CREATE INDEX IF NOT EXISTS idx_student_admissions_student_history 
            ON student_admissions(student_id, organization_id, admission_date DESC) 
            WHERE deleted_at IS NULL');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_attendance_records_student_history');
        DB::statement('DROP INDEX IF EXISTS idx_exam_results_student_history');
        DB::statement('DROP INDEX IF EXISTS idx_fee_payments_student_history');
        DB::statement('DROP INDEX IF EXISTS idx_fee_assignments_student_history');
        DB::statement('DROP INDEX IF EXISTS idx_library_loans_student_history');
        DB::statement('DROP INDEX IF EXISTS idx_student_id_cards_student_history');
        DB::statement('DROP INDEX IF EXISTS idx_course_students_main_student_history');
        DB::statement('DROP INDEX IF EXISTS idx_exam_students_admission_history');
        DB::statement('DROP INDEX IF EXISTS idx_student_admissions_student_history');
    }
};

