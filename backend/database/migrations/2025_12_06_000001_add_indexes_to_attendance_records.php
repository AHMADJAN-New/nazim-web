<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->index(['attendance_session_id', 'marked_at'], 'attendance_records_session_marked_idx');
            $table->index(['attendance_session_id', 'student_id'], 'attendance_records_session_student_idx');
        });
    }

    public function down(): void
    {
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->dropIndex('attendance_records_session_marked_idx');
            $table->dropIndex('attendance_records_session_student_idx');
        });
    }
};
