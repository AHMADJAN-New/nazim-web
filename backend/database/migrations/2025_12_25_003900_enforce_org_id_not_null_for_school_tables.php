<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * All non-permission resources are strictly org + school scoped.
     *
     * Many legacy tables were created with nullable organization_id (to support global rows).
     * We no longer allow org/global fallback for school-scoped data, so tighten organization_id
     * to NOT NULL when it's safe (no active NULL rows).
     */
    public function up(): void
    {
        $tables = [
            // Academics
            'classes',
            'subjects',
            'academic_years',
            'grades',
            'exams',
            'class_academic_years',
            'class_subject_templates',
            'class_subjects',

            // Timetables
            'schedule_slots',
            'generated_timetables',
            'timetable_entries',
            'teacher_timetable_preferences',
            'teacher_subject_assignments',

            // Library
            'library_books',
            'library_categories',
            'library_loans',
            'library_copies',

            // Finance/support
            'currencies',
            'exchange_rates',
            'donors',

            // Short-term courses
            'short_term_courses',
            'course_students',
            'course_attendance_sessions',
            'course_attendance_records',
            'course_documents',

            // Fees
            'fee_structures',
            'fee_assignments',
            'fee_payments',
            'fee_exceptions',
        ];

        foreach ($tables as $table) {
            if (!Schema::hasTable($table) || !Schema::hasColumn($table, 'organization_id')) {
                continue;
            }

            $q = DB::table($table)->whereNull('organization_id');
            if (Schema::hasColumn($table, 'deleted_at')) {
                $q->whereNull('deleted_at');
            }

            $activeNullOrg = (int) $q->count();
            if ($activeNullOrg === 0) {
                DB::statement("ALTER TABLE public.{$table} ALTER COLUMN organization_id SET NOT NULL");
            }
        }
    }

    public function down(): void
    {
        // Non-destructive down (schema hardening).
    }
};

