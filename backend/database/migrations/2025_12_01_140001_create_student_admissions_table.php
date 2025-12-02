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
        if (Schema::hasTable('student_admissions')) {
            return;
        }

        Schema::create('student_admissions', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id')->nullable();
            $table->uuid('student_id');
            $table->uuid('academic_year_id')->nullable();
            $table->uuid('class_id')->nullable();
            $table->uuid('class_academic_year_id')->nullable();
            $table->uuid('residency_type_id')->nullable();
            $table->uuid('room_id')->nullable();
            $table->string('admission_year', 10)->nullable();
            $table->date('admission_date')->default(DB::raw('CURRENT_DATE'));
            $table->string('enrollment_status', 30)->default('admitted');
            $table->string('enrollment_type', 50)->nullable();
            $table->string('shift', 50)->nullable();
            $table->boolean('is_boarder')->default(false);
            $table->string('fee_status', 50)->nullable();
            $table->text('placement_notes')->nullable();
            $table->timestampTz('created_at')->default(DB::raw('NOW()'));
            $table->timestampTz('updated_at')->default(DB::raw('NOW()'));
            $table->timestampTz('deleted_at')->nullable();

            // Foreign keys
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');
            $table->foreign('student_id')->references('id')->on('students')->onDelete('cascade');
            $table->foreign('academic_year_id')->references('id')->on('academic_years')->onDelete('set null');
            $table->foreign('class_id')->references('id')->on('classes')->onDelete('set null');
            $table->foreign('class_academic_year_id')->references('id')->on('class_academic_years')->onDelete('set null');
            $table->foreign('residency_type_id')->references('id')->on('residency_types')->onDelete('set null');
            $table->foreign('room_id')->references('id')->on('rooms')->onDelete('set null');

            // Indexes
            $table->index('organization_id', 'idx_student_admissions_org');
        });

        // Add partial unique index to prevent duplicate admissions per student per academic year
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS idx_student_admissions_unique_year ON student_admissions (student_id, academic_year_id) WHERE deleted_at IS NULL');
        
        // Add partial indexes
        DB::statement('CREATE INDEX IF NOT EXISTS idx_student_admissions_school ON student_admissions (school_id) WHERE deleted_at IS NULL');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_student_admissions_status ON student_admissions (enrollment_status) WHERE deleted_at IS NULL');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_student_admissions_class ON student_admissions (class_id) WHERE deleted_at IS NULL');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_student_admissions_residency ON student_admissions (residency_type_id) WHERE deleted_at IS NULL');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_student_admissions_room ON student_admissions (room_id) WHERE deleted_at IS NULL');

        // Create trigger for updated_at
        DB::statement("
            CREATE TRIGGER update_student_admissions_updated_at
                BEFORE UPDATE ON student_admissions
                FOR EACH ROW
                EXECUTE FUNCTION public.update_updated_at_column();
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS update_student_admissions_updated_at ON student_admissions');
        Schema::dropIfExists('student_admissions');
    }
};

