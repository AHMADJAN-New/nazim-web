<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_attendance_groups', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->uuid('course_id');
            $table->string('name', 100);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id', 'cag_org_id_fk')
                ->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('school_id', 'cag_school_id_fk')
                ->references('id')->on('school_branding')->cascadeOnDelete();
            $table->foreign('course_id', 'cag_course_id_fk')
                ->references('id')->on('short_term_courses')->cascadeOnDelete();

            $table->index('organization_id', 'cag_org_idx');
            $table->index('school_id', 'cag_school_idx');
            $table->index(['organization_id', 'school_id', 'course_id'], 'cag_org_school_course_idx');
        });

        DB::statement(
            'CREATE UNIQUE INDEX cag_active_name_uidx ON course_attendance_groups (course_id, lower(name)) WHERE deleted_at IS NULL'
        );

        Schema::create('course_attendance_group_students', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->uuid('course_attendance_group_id');
            $table->uuid('course_student_id');
            $table->timestamps();

            $table->foreign('organization_id', 'cags_org_id_fk')
                ->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('school_id', 'cags_school_id_fk')
                ->references('id')->on('school_branding')->cascadeOnDelete();
            $table->foreign('course_attendance_group_id', 'cags_group_id_fk')
                ->references('id')->on('course_attendance_groups')->cascadeOnDelete();
            $table->foreign('course_student_id', 'cags_student_id_fk')
                ->references('id')->on('course_students')->cascadeOnDelete();

            $table->unique(['course_attendance_group_id', 'course_student_id'], 'cags_group_student_uidx');
            $table->index('organization_id', 'cags_org_idx');
            $table->index('school_id', 'cags_school_idx');
            $table->index('course_student_id', 'cags_student_idx');
        });

        Schema::table('course_attendance_sessions', function (Blueprint $table) {
            $table->uuid('attendance_group_id')->nullable()->after('course_id');
            $table->foreign('attendance_group_id', 'cas_attendance_group_id_fk')
                ->references('id')->on('course_attendance_groups')->nullOnDelete();
            $table->index(['organization_id', 'school_id', 'attendance_group_id'], 'cas_org_school_group_idx');
        });
    }

    public function down(): void
    {
        Schema::table('course_attendance_sessions', function (Blueprint $table) {
            $table->dropIndex('cas_org_school_group_idx');
            $table->dropForeign('cas_attendance_group_id_fk');
            $table->dropColumn('attendance_group_id');
        });

        Schema::dropIfExists('course_attendance_group_students');
        Schema::dropIfExists('course_attendance_groups');
    }
};
