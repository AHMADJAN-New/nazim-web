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
        if (Schema::hasTable('student_id_cards')) {
            return;
        }

        // Check if required tables exist
        $organizationsExists = Schema::hasTable('organizations');
        $studentsExists = Schema::hasTable('students');
        $studentAdmissionsExists = Schema::hasTable('student_admissions');
        $idCardTemplatesExists = Schema::hasTable('id_card_templates');
        $academicYearsExists = Schema::hasTable('academic_years');
        $classesExists = Schema::hasTable('classes');
        $classAcademicYearsExists = Schema::hasTable('class_academic_years');
        $profilesExists = Schema::hasTable('profiles');
        $schoolBrandingExists = Schema::hasTable('school_branding');
        $incomeEntriesExists = Schema::hasTable('income_entries');

        Schema::create('student_id_cards', function (Blueprint $table) use (
            $organizationsExists,
            $studentsExists,
            $studentAdmissionsExists,
            $idCardTemplatesExists,
            $academicYearsExists,
            $classesExists,
            $classAcademicYearsExists,
            $profilesExists,
            $schoolBrandingExists,
            $incomeEntriesExists
        ) {
            // UUID primary key
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));

            // Multi-tenancy: organization_id is required
            $table->uuid('organization_id');
            if ($organizationsExists) {
                $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            }

            // School reference (nullable, as some cards might not have a school)
            $table->uuid('school_id')->nullable()->after('organization_id');
            if ($schoolBrandingExists) {
                $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');
            }

            // Student and admission references
            $table->uuid('student_id');
            if ($studentsExists) {
                $table->foreign('student_id')->references('id')->on('students')->onDelete('cascade');
            }

            $table->uuid('student_admission_id');
            if ($studentAdmissionsExists) {
                $table->foreign('student_admission_id')->references('id')->on('student_admissions')->onDelete('cascade');
            }

            // Template reference
            $table->uuid('id_card_template_id');
            if ($idCardTemplatesExists) {
                $table->foreign('id_card_template_id')->references('id')->on('id_card_templates')->onDelete('cascade');
            }

            // Academic year reference
            $table->uuid('academic_year_id');
            if ($academicYearsExists) {
                $table->foreign('academic_year_id')->references('id')->on('academic_years')->onDelete('cascade');
            }

            // Class references (nullable)
            $table->uuid('class_id')->nullable();
            if ($classesExists) {
                $table->foreign('class_id')->references('id')->on('classes')->onDelete('set null');
            }

            $table->uuid('class_academic_year_id')->nullable();
            if ($classAcademicYearsExists) {
                $table->foreign('class_academic_year_id')->references('id')->on('class_academic_years')->onDelete('set null');
            }

            // Card information
            $table->string('card_number', 50)->nullable();
            $table->decimal('card_fee', 10, 2)->default(0);
            $table->boolean('card_fee_paid')->default(false);
            $table->timestampTz('card_fee_paid_date')->nullable();
            $table->uuid('income_entry_id')->nullable()->after('card_fee_paid_date');
            if ($incomeEntriesExists) {
                $table->foreign('income_entry_id')->references('id')->on('income_entries')->onDelete('set null');
            }
            $table->boolean('is_printed')->default(false);
            $table->timestampTz('printed_at')->nullable();

            // Printed by reference (nullable)
            $table->uuid('printed_by')->nullable();
            if ($profilesExists) {
                $table->foreign('printed_by')->references('id')->on('profiles')->onDelete('set null');
            }

            // Notes
            $table->text('notes')->nullable();

            // Timestamps
            $table->timestampTz('created_at')->default(DB::raw('NOW()'));
            $table->timestampTz('updated_at')->default(DB::raw('NOW()'));
            $table->timestampTz('deleted_at')->nullable();

            // Indexes for performance
            $table->index('organization_id');
            $table->index('school_id');
            $table->index('student_id');
            $table->index('student_admission_id');
            $table->index('id_card_template_id');
            $table->index('academic_year_id');
            $table->index('class_id');
            $table->index('class_academic_year_id');
            $table->index('income_entry_id');
            $table->index('is_printed');
            $table->index('card_fee_paid');
            $table->index('deleted_at');
            $table->index('card_number');
        });

        // Create unique constraint: one card per student per academic year (excluding soft-deleted)
        DB::statement("
            CREATE UNIQUE INDEX idx_student_id_cards_unique_admission_year 
            ON public.student_id_cards (student_admission_id, academic_year_id)
            WHERE deleted_at IS NULL;
        ");

        // Create trigger for updated_at
        DB::statement("
            CREATE TRIGGER update_student_id_cards_updated_at
            BEFORE UPDATE ON public.student_id_cards
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_id_cards');
    }
};

