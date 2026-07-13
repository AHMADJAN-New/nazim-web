<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE public.exam_seat_assignments DROP CONSTRAINT IF EXISTS exam_seat_assignments_disabled_check');

        DB::statement(<<<'SQL'
            ALTER TABLE public.exam_seat_assignments
            ADD CONSTRAINT exam_seat_assignments_disabled_check
            CHECK (
                (is_disabled = true AND exam_student_id IS NULL)
                OR (is_disabled = false)
            )
        SQL);
    }

    public function down(): void
    {
        DB::statement(<<<'SQL'
            UPDATE public.exam_seat_assignments
            SET is_disabled = true
            WHERE exam_student_id IS NULL
              AND is_disabled = false
        SQL);

        DB::statement('ALTER TABLE public.exam_seat_assignments DROP CONSTRAINT IF EXISTS exam_seat_assignments_disabled_check');

        DB::statement(<<<'SQL'
            ALTER TABLE public.exam_seat_assignments
            ADD CONSTRAINT exam_seat_assignments_disabled_check
            CHECK (
                (is_disabled = true AND exam_student_id IS NULL)
                OR (is_disabled = false AND exam_student_id IS NOT NULL)
            )
        SQL);
    }
};
