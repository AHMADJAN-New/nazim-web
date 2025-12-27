<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('exam_results', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('exam_id');
            $table->uuid('exam_subject_id');
            $table->uuid('exam_student_id');
            $table->uuid('student_admission_id');
            $table->decimal('marks_obtained', 8, 2)->nullable();
            $table->boolean('is_absent')->default(false);
            $table->text('remarks')->nullable();
            $table->uuid('organization_id');
            $table->timestamps();
            $table->softDeletes();

            // Foreign keys
            $table->foreign('exam_id')
                ->references('id')
                ->on('exams')
                ->onDelete('cascade');

            $table->foreign('exam_subject_id')
                ->references('id')
                ->on('exam_subjects')
                ->onDelete('cascade');

            $table->foreign('exam_student_id')
                ->references('id')
                ->on('exam_students')
                ->onDelete('cascade');

            $table->foreign('student_admission_id')
                ->references('id')
                ->on('student_admissions')
                ->onDelete('cascade');

            $table->foreign('organization_id')
                ->references('id')
                ->on('organizations')
                ->onDelete('cascade');

            // Indexes for performance
            $table->index('exam_id');
            $table->index('exam_subject_id');
            $table->index('exam_student_id');
            $table->index('student_admission_id');
            $table->index('organization_id');
            $table->index('deleted_at');

            // Unique constraint: one result per student per subject
            $table->unique(['exam_subject_id', 'exam_student_id', 'deleted_at'], 'idx_exam_results_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exam_results');
    }
};
