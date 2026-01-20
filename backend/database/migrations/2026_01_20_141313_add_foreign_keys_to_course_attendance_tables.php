<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Adds missing foreign keys to course_attendance_sessions and course_attendance_records tables:
     * - organization_id references organizations
     * - school_id references school_branding
     * - created_by, closed_by, marked_by reference profiles
     * - course_id in records table references short_term_courses
     */
    public function up(): void
    {
        // Add foreign keys to course_attendance_sessions
        Schema::table('course_attendance_sessions', function (Blueprint $table) {
            $table->foreign('organization_id')
                ->references('id')
                ->on('organizations')
                ->onDelete('cascade');

            $table->foreign('school_id')
                ->references('id')
                ->on('school_branding')
                ->onDelete('cascade');

            $table->foreign('created_by')
                ->references('id')
                ->on('profiles')
                ->onDelete('set null');

            $table->foreign('closed_by')
                ->references('id')
                ->on('profiles')
                ->onDelete('set null');
        });

        // Add foreign keys to course_attendance_records
        Schema::table('course_attendance_records', function (Blueprint $table) {
            $table->foreign('organization_id')
                ->references('id')
                ->on('organizations')
                ->onDelete('cascade');

            $table->foreign('school_id')
                ->references('id')
                ->on('school_branding')
                ->onDelete('cascade');

            $table->foreign('course_id')
                ->references('id')
                ->on('short_term_courses')
                ->onDelete('cascade');

            $table->foreign('marked_by')
                ->references('id')
                ->on('profiles')
                ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop foreign keys from course_attendance_records
        Schema::table('course_attendance_records', function (Blueprint $table) {
            $table->dropForeign(['organization_id']);
            $table->dropForeign(['school_id']);
            $table->dropForeign(['course_id']);
            $table->dropForeign(['marked_by']);
        });

        // Drop foreign keys from course_attendance_sessions
        Schema::table('course_attendance_sessions', function (Blueprint $table) {
            $table->dropForeign(['organization_id']);
            $table->dropForeign(['school_id']);
            $table->dropForeign(['created_by']);
            $table->dropForeign(['closed_by']);
        });
    }
};
