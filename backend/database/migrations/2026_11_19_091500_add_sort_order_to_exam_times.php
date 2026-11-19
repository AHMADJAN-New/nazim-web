<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('exam_times') && ! Schema::hasColumn('exam_times', 'sort_order')) {
            Schema::table('exam_times', function (Blueprint $table) {
                $table->unsignedSmallInteger('sort_order')->default(0);
            });
        }

        // Exact room+start uniqueness blocked several subjects of the same class
        // from sharing one slot and room. Overlap is enforced in ExamTimeController.
        DB::statement('DROP INDEX IF EXISTS idx_exam_times_room_unique');
    }

    public function down(): void
    {
        if (Schema::hasTable('exam_times') && Schema::hasColumn('exam_times', 'sort_order')) {
            Schema::table('exam_times', function (Blueprint $table) {
                $table->dropColumn('sort_order');
            });
        }

        DB::statement('
            CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_times_room_unique
            ON exam_times (room_id, date, start_time)
            WHERE deleted_at IS NULL AND room_id IS NOT NULL
        ');
    }
};
