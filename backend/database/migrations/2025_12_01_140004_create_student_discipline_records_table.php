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
        if (Schema::hasTable('student_discipline_records')) {
            return;
        }

        Schema::create('student_discipline_records', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('student_id');
            $table->uuid('organization_id');
            $table->uuid('school_id')->nullable();
            $table->date('incident_date');
            $table->string('incident_type', 100);
            $table->text('description')->nullable();
            $table->string('severity', 20)->default('minor');
            $table->text('action_taken')->nullable();
            $table->boolean('resolved')->default(false);
            $table->date('resolved_date')->nullable();
            $table->uuid('resolved_by')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestampTz('created_at')->default(DB::raw('NOW()'));
            $table->timestampTz('updated_at')->default(DB::raw('NOW()'));
            $table->timestampTz('deleted_at')->nullable();

            // Foreign keys
            $table->foreign('student_id')->references('id')->on('students')->onDelete('cascade');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');
            $table->foreign('resolved_by')->references('id')->on('profiles')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('profiles')->onDelete('set null');

            // Indexes
            $table->index('student_id', 'idx_student_discipline_student_id');
            $table->index('organization_id', 'idx_student_discipline_organization_id');
            $table->index('school_id', 'idx_student_discipline_school_id');
        });

        // Add partial indexes
        DB::statement('CREATE INDEX IF NOT EXISTS idx_student_discipline_incident_date ON student_discipline_records (incident_date) WHERE deleted_at IS NULL');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_student_discipline_severity ON student_discipline_records (severity) WHERE deleted_at IS NULL');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_student_discipline_resolved ON student_discipline_records (resolved) WHERE deleted_at IS NULL');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_student_discipline_deleted_at ON student_discipline_records (deleted_at) WHERE deleted_at IS NULL');

        // Create trigger for updated_at
        DB::statement("
            CREATE TRIGGER update_student_discipline_updated_at
                BEFORE UPDATE ON student_discipline_records
                FOR EACH ROW
                EXECUTE FUNCTION public.update_updated_at_column();
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS update_student_discipline_updated_at ON student_discipline_records');
        Schema::dropIfExists('student_discipline_records');
    }
};

