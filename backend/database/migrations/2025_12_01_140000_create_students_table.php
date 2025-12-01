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
        // Skip if table already exists (created via Supabase migrations)
        if (Schema::hasTable('students')) {
            return;
        }

        Schema::create('students', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id')->nullable();
            $table->string('card_number', 50)->nullable();
            $table->string('admission_no', 100);
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
            $table->string('admission_fee_status', 20)->default('pending');
            $table->string('student_status', 20)->default('active');
            $table->string('disability_status', 150)->nullable();
            $table->string('emergency_contact_name', 150)->nullable();
            $table->string('emergency_contact_phone', 25)->nullable();
            $table->string('family_income', 100)->nullable();
            $table->string('picture_path', 255)->nullable();
            $table->timestampTz('created_at')->default(DB::raw('NOW()'));
            $table->timestampTz('updated_at')->default(DB::raw('NOW()'));
            $table->timestampTz('deleted_at')->nullable();

            // Foreign keys
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');

            // Indexes
            $table->index('organization_id', 'idx_students_org');
        });

        // Add partial unique index for admission_no per organization
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS idx_students_unique_admission_per_org ON students (admission_no, organization_id) WHERE deleted_at IS NULL');
        
        // Add partial indexes
        DB::statement('CREATE INDEX IF NOT EXISTS idx_students_school ON students (school_id) WHERE deleted_at IS NULL');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_students_status ON students (student_status) WHERE deleted_at IS NULL');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_students_fee_status ON students (admission_fee_status) WHERE deleted_at IS NULL');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_students_gender ON students (gender) WHERE deleted_at IS NULL');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_students_is_orphan ON students (is_orphan) WHERE deleted_at IS NULL');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_students_deleted_at ON students (deleted_at) WHERE deleted_at IS NULL');

        // Create trigger for updated_at
        DB::statement("
            CREATE TRIGGER update_students_updated_at
                BEFORE UPDATE ON students
                FOR EACH ROW
                EXECUTE FUNCTION public.update_updated_at_column();
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS update_students_updated_at ON students');
        Schema::dropIfExists('students');
    }
};

