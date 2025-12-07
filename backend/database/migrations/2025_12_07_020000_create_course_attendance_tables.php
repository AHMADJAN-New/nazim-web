<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Course Attendance Sessions
        Schema::create('course_attendance_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id')->index();
            $table->uuid('course_id')->index();
            $table->date('session_date');
            $table->string('session_title')->nullable();
            $table->enum('method', ['manual', 'barcode'])->default('manual');
            $table->enum('status', ['open', 'closed'])->default('open')->index();
            $table->text('remarks')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->uuid('closed_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('course_id')
                ->references('id')
                ->on('short_term_courses')
                ->onDelete('cascade');

            $table->index(['course_id', 'session_date']);
            $table->index(['organization_id', 'session_date']);
        });

        // Course Attendance Records
        Schema::create('course_attendance_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('attendance_session_id')->index();
            $table->uuid('organization_id')->index();
            $table->uuid('course_id')->index();
            $table->uuid('course_student_id')->index();
            $table->enum('status', ['present', 'absent', 'late', 'excused', 'sick', 'leave'])->default('absent')->index();
            $table->enum('entry_method', ['manual', 'barcode'])->default('manual');
            $table->timestamp('marked_at')->nullable();
            $table->uuid('marked_by')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('attendance_session_id')
                ->references('id')
                ->on('course_attendance_sessions')
                ->onDelete('cascade');

            $table->foreign('course_student_id')
                ->references('id')
                ->on('course_students')
                ->onDelete('cascade');

            $table->unique(['attendance_session_id', 'course_student_id', 'deleted_at'], 'course_attendance_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_attendance_records');
        Schema::dropIfExists('course_attendance_sessions');
    }
};
