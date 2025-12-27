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
        Schema::create('exam_students', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('exam_id');
            $table->uuid('exam_class_id');
            $table->uuid('student_admission_id');
            $table->uuid('organization_id');
            $table->timestamps();
            $table->softDeletes();

            // Foreign keys
            $table->foreign('exam_id')
                ->references('id')
                ->on('exams')
                ->onDelete('cascade');

            $table->foreign('exam_class_id')
                ->references('id')
                ->on('exam_classes')
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
            $table->index('exam_class_id');
            $table->index('student_admission_id');
            $table->index('organization_id');
            $table->index('deleted_at');

            // Unique constraint: prevent duplicate enrollment
            $table->unique(['exam_id', 'student_admission_id', 'deleted_at'], 'idx_exam_students_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exam_students');
    }
};
