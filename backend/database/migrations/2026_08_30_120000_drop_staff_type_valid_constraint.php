<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * staff_type_id + staff_types.code is the source of truth.
     * Legacy staff_type_valid CHECK blocked custom org staff type codes.
     */
    public function up(): void
    {
        DB::statement('ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS staff_type_valid');
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE public.staff
            ADD CONSTRAINT staff_type_valid CHECK (staff_type IN (
                'teacher','admin','accountant','librarian','hostel_manager',
                'asset_manager','security','maintenance','other'
            ))
        ");
    }
};
