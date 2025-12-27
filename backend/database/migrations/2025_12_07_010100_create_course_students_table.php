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
        Schema::create('course_students', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id')->index();
            $table->uuid('course_id')->index();
            $table->uuid('main_student_id')->nullable()->index();
            $table->string('admission_no');
            $table->date('registration_date');
            $table->enum('completion_status', ['enrolled', 'completed', 'dropped', 'failed'])->default('enrolled')->index();
            $table->date('completion_date')->nullable();
            $table->string('grade')->nullable();
            $table->boolean('certificate_issued')->default(false);
            $table->date('certificate_issued_date')->nullable();
            $table->boolean('fee_paid')->default(false);
            $table->date('fee_paid_date')->nullable();
            $table->decimal('fee_amount', 10, 2)->nullable();
            $table->string('card_number')->nullable();
            $table->string('full_name')->nullable();
            $table->string('father_name')->nullable();
            $table->string('grandfather_name')->nullable();
            $table->string('mother_name')->nullable();
            $table->string('gender')->nullable();
            $table->integer('birth_year')->nullable();
            $table->date('birth_date')->nullable();
            $table->integer('age')->nullable();
            $table->string('orig_province')->nullable();
            $table->string('orig_district')->nullable();
            $table->string('orig_village')->nullable();
            $table->string('curr_province')->nullable();
            $table->string('curr_district')->nullable();
            $table->string('curr_village')->nullable();
            $table->string('nationality')->nullable();
            $table->string('preferred_language')->nullable();
            $table->string('previous_school')->nullable();
            $table->string('guardian_name')->nullable();
            $table->string('guardian_relation')->nullable();
            $table->string('guardian_phone')->nullable();
            $table->string('guardian_tazkira')->nullable();
            $table->string('guardian_picture_path')->nullable();
            $table->string('home_address')->nullable();
            $table->string('zamin_name')->nullable();
            $table->string('zamin_phone')->nullable();
            $table->string('zamin_tazkira')->nullable();
            $table->string('zamin_address')->nullable();
            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_contact_phone')->nullable();
            $table->string('family_income')->nullable();
            $table->string('picture_path')->nullable();
            $table->boolean('is_orphan')->default(false);
            $table->string('disability_status')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['admission_no', 'organization_id'], 'course_students_admission_no_organization_id_unique');

            $table->foreign('course_id')->references('id')->on('short_term_courses')->onDelete('cascade');
            $table->foreign('main_student_id')->references('id')->on('students')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('course_students');
    }
};
