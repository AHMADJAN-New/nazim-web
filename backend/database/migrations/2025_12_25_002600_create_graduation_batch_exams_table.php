<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('graduation_batch_exams', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('batch_id');
            $table->uuid('exam_id');
            $table->decimal('weight_percentage', 5, 2)->nullable(); // Override default weight
            $table->boolean('is_required')->default(true);
            $table->integer('display_order')->default(0);
            $table->timestamps();

            $table->foreign('batch_id')->references('id')->on('graduation_batches')->onDelete('cascade');
            $table->foreign('exam_id')->references('id')->on('exams')->onDelete('cascade');
            $table->unique(['batch_id', 'exam_id']);
            $table->index('batch_id');
            $table->index('exam_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('graduation_batch_exams');
    }
};

