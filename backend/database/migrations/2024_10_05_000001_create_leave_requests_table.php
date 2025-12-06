<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leave_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('student_id');
            $table->uuid('class_id')->nullable();
            $table->uuid('academic_year_id')->nullable();
            $table->uuid('school_id')->nullable();
            $table->string('leave_type')->default('full_day');
            $table->date('start_date');
            $table->date('end_date');
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->string('reason');
            $table->string('status')->default('pending');
            $table->uuid('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->text('approval_note')->nullable();
            $table->uuid('created_by');
            $table->string('qr_token')->unique();
            $table->timestamp('qr_used_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'student_id']);
            $table->index(['organization_id', 'class_id']);
            $table->index(['organization_id', 'status']);
            $table->index(['start_date', 'end_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_requests');
    }
};
