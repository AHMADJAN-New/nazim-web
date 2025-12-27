<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('graduation_students', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('batch_id');
            $table->uuid('student_id');
            $table->string('final_result_status')->default('pass');
            $table->integer('position')->nullable();
            $table->text('remarks')->nullable();
            $table->json('eligibility_json')->nullable();
            $table->timestamps();

            $table->foreign('batch_id')->references('id')->on('graduation_batches')->onDelete('cascade');
            $table->foreign('student_id')->references('id')->on('students')->onDelete('cascade');

            $table->unique(['batch_id', 'student_id'], 'uniq_grad_student_batch');
            $table->index('student_id', 'idx_grad_students_student');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('graduation_students');
    }
};
