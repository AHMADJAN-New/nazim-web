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
        Schema::create('course_student_discipline_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('course_student_id')->index();
            $table->uuid('organization_id')->index();
            $table->uuid('course_id')->index();
            $table->date('incident_date');
            $table->string('incident_type');
            $table->text('description')->nullable();
            $table->enum('severity', ['minor', 'moderate', 'major', 'severe'])->default('minor')->index();
            $table->text('action_taken')->nullable();
            $table->boolean('resolved')->default(false)->index();
            $table->date('resolved_date')->nullable();
            $table->uuid('resolved_by')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('incident_date');

            $table->foreign('course_student_id')->references('id')->on('course_students')->onDelete('cascade');
            $table->foreign('course_id')->references('id')->on('short_term_courses')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('course_student_discipline_records');
    }
};
