<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('student_history_audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('student_id');
            $table->uuid('user_id');
            $table->string('action', 50); // 'view', 'export_pdf', 'export_excel'
            $table->string('section', 50)->nullable(); // 'overview', 'admissions', 'exams', etc.
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestampTz('created_at')->default(DB::raw('NOW()'));

            // Foreign keys
            $table->foreign('student_id')->references('id')->on('students')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');

            // Indexes for common queries
            $table->index('student_id', 'idx_student_history_audit_student');
            $table->index('user_id', 'idx_student_history_audit_user');
            $table->index('action', 'idx_student_history_audit_action');
            $table->index('created_at', 'idx_student_history_audit_created');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_history_audit_logs');
    }
};

