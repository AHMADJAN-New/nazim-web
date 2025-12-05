<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('attendance_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id')->nullable();
            $table->uuid('class_id');
            $table->uuid('academic_year_id')->nullable();
            $table->date('session_date');
            $table->string('method');
            $table->string('status')->default('open');
            $table->text('remarks')->nullable();
            $table->uuid('created_by');
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');
            $table->foreign('class_id')->references('id')->on('classes')->onDelete('cascade');
            $table->foreign('academic_year_id')->references('id')->on('academic_years')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');

            $table->index(['organization_id', 'class_id', 'session_date'], 'attendance_sessions_org_class_date_idx');
            $table->index(['organization_id', 'school_id'], 'attendance_sessions_org_school_idx');
        });

        Schema::create('attendance_records', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('attendance_session_id');
            $table->uuid('organization_id');
            $table->uuid('school_id')->nullable();
            $table->uuid('student_id');
            $table->string('status');
            $table->string('entry_method')->default('manual');
            $table->timestamp('marked_at')->useCurrent();
            $table->uuid('marked_by');
            $table->text('note')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('attendance_session_id')->references('id')->on('attendance_sessions')->onDelete('cascade');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');
            $table->foreign('student_id')->references('id')->on('students')->onDelete('cascade');
            $table->foreign('marked_by')->references('id')->on('users')->onDelete('cascade');

            $table->unique(['attendance_session_id', 'student_id', 'deleted_at'], 'attendance_records_unique_student');
            $table->index(['organization_id', 'student_id'], 'attendance_records_org_student_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance_records');
        Schema::dropIfExists('attendance_sessions');
    }
};
