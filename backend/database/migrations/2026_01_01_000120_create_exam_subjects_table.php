<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('exam_subjects')) {
            Schema::create('exam_subjects', function (Blueprint $table) {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->uuid('exam_id');
                $table->uuid('exam_class_id');
                $table->uuid('class_subject_id');
                $table->uuid('subject_id');
                $table->uuid('organization_id');
                $table->integer('total_marks')->nullable();
                $table->integer('passing_marks')->nullable();
                $table->timestamp('scheduled_at')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->foreign('exam_id')->references('id')->on('exams')->onDelete('cascade');
                $table->foreign('exam_class_id')->references('id')->on('exam_classes')->onDelete('cascade');
                $table->foreign('class_subject_id')->references('id')->on('class_subjects')->onDelete('cascade');
                $table->foreign('subject_id')->references('id')->on('subjects')->onDelete('cascade');
                $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');

                $table->index('exam_id');
                $table->index('exam_class_id');
                $table->index('class_subject_id');
                $table->index('subject_id');
                $table->index('organization_id');
                $table->index('deleted_at');
            });

            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_subjects_unique ON exam_subjects (exam_class_id, class_subject_id) WHERE deleted_at IS NULL');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_subjects');
    }
};
