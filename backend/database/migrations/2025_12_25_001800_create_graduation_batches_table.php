<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('graduation_batches', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->uuid('academic_year_id');
            $table->uuid('class_id');
            $table->uuid('exam_id');
            $table->date('graduation_date');
            $table->string('status')->default('draft');
            $table->uuid('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->uuid('created_by');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
            $table->foreign('academic_year_id')->references('id')->on('academic_years')->onDelete('cascade');
            $table->foreign('class_id')->references('id')->on('classes')->onDelete('cascade');
            $table->foreign('exam_id')->references('id')->on('exams')->onDelete('cascade');

            $table->index(['school_id', 'academic_year_id'], 'idx_grad_batches_school_year');
            $table->index('exam_id', 'idx_grad_batches_exam');
            $table->index('class_id', 'idx_grad_batches_class');
            $table->index('status', 'idx_grad_batches_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('graduation_batches');
    }
};
