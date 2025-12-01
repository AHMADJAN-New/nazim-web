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
        if (Schema::hasTable('student_educational_history')) {
            return;
        }

        Schema::create('student_educational_history', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('student_id');
            $table->uuid('organization_id');
            $table->uuid('school_id')->nullable();
            $table->string('institution_name', 255);
            $table->string('academic_year', 20)->nullable();
            $table->string('grade_level', 50)->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->text('achievements')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestampTz('created_at')->default(DB::raw('NOW()'));
            $table->timestampTz('updated_at')->default(DB::raw('NOW()'));
            $table->timestampTz('deleted_at')->nullable();

            // Foreign keys
            $table->foreign('student_id')->references('id')->on('students')->onDelete('cascade');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('profiles')->onDelete('set null');

            // Indexes
            $table->index('student_id', 'idx_student_edu_history_student_id');
            $table->index('organization_id', 'idx_student_edu_history_organization_id');
            $table->index('school_id', 'idx_student_edu_history_school_id');
        });

        // Add partial indexes
        DB::statement('CREATE INDEX IF NOT EXISTS idx_student_edu_history_deleted_at ON student_educational_history (deleted_at) WHERE deleted_at IS NULL');

        // Create trigger for updated_at
        DB::statement("
            CREATE TRIGGER update_student_edu_history_updated_at
                BEFORE UPDATE ON student_educational_history
                FOR EACH ROW
                EXECUTE FUNCTION public.update_updated_at_column();
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS update_student_edu_history_updated_at ON student_educational_history');
        Schema::dropIfExists('student_educational_history');
    }
};

