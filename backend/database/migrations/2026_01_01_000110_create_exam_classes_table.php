<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('exam_classes')) {
            Schema::create('exam_classes', function (Blueprint $table) {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->uuid('exam_id');
                $table->uuid('class_academic_year_id');
                $table->uuid('organization_id');
                $table->timestamps();
                $table->softDeletes();

                $table->foreign('exam_id')->references('id')->on('exams')->onDelete('cascade');
                $table->foreign('class_academic_year_id')->references('id')->on('class_academic_years')->onDelete('cascade');
                $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');

                $table->index('exam_id');
                $table->index('class_academic_year_id');
                $table->index('organization_id');
                $table->index('deleted_at');
            });

            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_classes_unique ON exam_classes (exam_id, class_academic_year_id) WHERE deleted_at IS NULL');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_classes');
    }
};
