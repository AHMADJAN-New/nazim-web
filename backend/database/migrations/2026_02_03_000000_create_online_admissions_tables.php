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
        Schema::create('online_admissions', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->uuid('student_id')->nullable();
            $table->string('application_no', 50);
            $table->string('status', 30)->default('submitted');
            $table->timestampTz('submitted_at')->default(DB::raw('NOW()'));
            $table->uuid('reviewed_by')->nullable();
            $table->timestampTz('reviewed_at')->nullable();
            $table->timestampTz('accepted_at')->nullable();
            $table->timestampTz('rejected_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->text('notes')->nullable();

            $table->string('full_name', 150);
            $table->string('father_name', 150);
            $table->string('grandfather_name', 150)->nullable();
            $table->string('mother_name', 150)->nullable();
            $table->string('gender', 10);
            $table->string('birth_year', 10)->nullable();
            $table->date('birth_date')->nullable();
            $table->integer('age')->nullable();
            $table->string('admission_year', 10)->nullable();
            $table->string('orig_province', 100)->nullable();
            $table->string('orig_district', 100)->nullable();
            $table->string('orig_village', 150)->nullable();
            $table->string('curr_province', 100)->nullable();
            $table->string('curr_district', 100)->nullable();
            $table->string('curr_village', 150)->nullable();
            $table->string('nationality', 100)->nullable();
            $table->string('preferred_language', 100)->nullable();
            $table->string('previous_school', 150)->nullable();
            $table->string('previous_grade_level', 50)->nullable();
            $table->string('previous_academic_year', 20)->nullable();
            $table->text('previous_school_notes')->nullable();
            $table->string('guardian_name', 150)->nullable();
            $table->string('guardian_relation', 100)->nullable();
            $table->string('guardian_phone', 25)->nullable();
            $table->string('guardian_tazkira', 100)->nullable();
            $table->string('guardian_picture_path', 255)->nullable();
            $table->text('home_address')->nullable();
            $table->string('zamin_name', 150)->nullable();
            $table->string('zamin_phone', 25)->nullable();
            $table->string('zamin_tazkira', 100)->nullable();
            $table->text('zamin_address')->nullable();
            $table->string('applying_grade', 50)->nullable();
            $table->boolean('is_orphan')->default(false);
            $table->string('disability_status', 150)->nullable();
            $table->string('emergency_contact_name', 150)->nullable();
            $table->string('emergency_contact_phone', 25)->nullable();
            $table->string('family_income', 100)->nullable();
            $table->string('picture_path', 255)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
            $table->foreign('student_id')->references('id')->on('students')->onDelete('set null');
            $table->foreign('reviewed_by')->references('id')->on('profiles')->onDelete('set null');

            $table->index(['organization_id', 'school_id'], 'idx_online_admissions_org_school');
            $table->index('organization_id', 'idx_online_admissions_org');
            $table->index(['school_id', 'status'], 'idx_online_admissions_status');
        });

        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS idx_online_admissions_app_no ON online_admissions (organization_id, application_no) WHERE deleted_at IS NULL');

        Schema::create('online_admission_documents', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('online_admission_id');
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->string('document_type', 100);
            $table->string('file_name', 255);
            $table->text('file_path');
            $table->bigInteger('file_size')->nullable();
            $table->string('mime_type', 100)->nullable();
            $table->text('description')->nullable();
            $table->uuid('uploaded_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('online_admission_id')->references('id')->on('online_admissions')->onDelete('cascade');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
            $table->foreign('uploaded_by')->references('id')->on('profiles')->onDelete('set null');

            $table->index('online_admission_id', 'idx_online_admission_docs_admission');
            $table->index('organization_id', 'idx_online_admission_docs_org');
            $table->index('school_id', 'idx_online_admission_docs_school');
        });

        Schema::create('online_admission_fields', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->string('key', 50);
            $table->string('label', 100);
            $table->enum('field_type', [
                'text',
                'textarea',
                'phone',
                'number',
                'select',
                'multiselect',
                'date',
                'toggle',
                'email',
                'id_number',
                'address',
                'photo',
                'file'
            ])->default('text');
            $table->boolean('is_required')->default(false);
            $table->boolean('is_enabled')->default(true);
            $table->integer('sort_order')->default(0);
            $table->string('placeholder', 255)->nullable();
            $table->string('help_text', 255)->nullable();
            $table->json('validation_rules')->nullable();
            $table->json('options')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');

            $table->index('organization_id', 'idx_online_admission_fields_org');
            $table->index(['school_id', 'sort_order'], 'idx_online_admission_fields_sort');
            $table->index(['school_id', 'is_enabled'], 'idx_online_admission_fields_enabled');
            $table->unique(['school_id', 'key'], 'uniq_online_admission_fields_key');
        });

        Schema::create('online_admission_field_values', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('online_admission_id');
            $table->uuid('field_id');
            $table->text('value_text')->nullable();
            $table->json('value_json')->nullable();
            $table->text('file_path')->nullable();
            $table->string('file_name', 255)->nullable();
            $table->string('mime_type', 100)->nullable();
            $table->bigInteger('file_size')->nullable();
            $table->timestamps();

            $table->foreign('online_admission_id')->references('id')->on('online_admissions')->onDelete('cascade');
            $table->foreign('field_id')->references('id')->on('online_admission_fields')->onDelete('cascade');

            $table->index(['online_admission_id', 'field_id'], 'idx_online_admission_field_values_lookup');
            $table->unique(['online_admission_id', 'field_id'], 'uniq_online_admission_field_values');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('online_admission_field_values');
        Schema::dropIfExists('online_admission_fields');
        Schema::dropIfExists('online_admission_documents');
        Schema::dropIfExists('online_admissions');
    }
};
