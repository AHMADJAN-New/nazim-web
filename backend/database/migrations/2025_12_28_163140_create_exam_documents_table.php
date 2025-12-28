<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exam_documents', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id')->index();
            $table->uuid('school_id')->index();
            $table->uuid('exam_id')->index();
            $table->uuid('exam_class_id')->nullable()->index();
            $table->uuid('exam_student_id')->nullable()->index();
            $table->string('document_type')->index(); // question_paper, answer_key, instruction, result, grade_sheet, other
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('file_name');
            $table->string('file_path');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->uuid('uploaded_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')
                ->references('id')
                ->on('organizations')
                ->onDelete('cascade');

            $table->foreign('exam_id')
                ->references('id')
                ->on('exams')
                ->onDelete('cascade');

            $table->foreign('exam_class_id')
                ->references('id')
                ->on('exam_classes')
                ->onDelete('cascade');

            $table->foreign('exam_student_id')
                ->references('id')
                ->on('exam_students')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_documents');
    }
};
