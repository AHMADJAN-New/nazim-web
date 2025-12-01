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
        if (Schema::hasTable('generated_timetables')) {
            return;
        }

        // Check if required tables exist before creating foreign keys
        $organizationsExists = Schema::hasTable('organizations');
        $academicYearsExists = Schema::hasTable('academic_years');
        $schoolBrandingExists = Schema::hasTable('school_branding');
        $profilesExists = Schema::hasTable('profiles');

        Schema::create('generated_timetables', function (Blueprint $table) use ($organizationsExists, $academicYearsExists, $schoolBrandingExists, $profilesExists) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id')->nullable();
            $table->uuid('academic_year_id')->nullable();
            $table->uuid('school_id')->nullable();
            $table->string('name', 150);
            $table->string('timetable_type', 50)->default('teaching');
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->uuid('created_by')->nullable();
            $table->timestampTz('created_at')->default(DB::raw('NOW()'));
            $table->timestampTz('updated_at')->default(DB::raw('NOW()'));
            $table->timestampTz('deleted_at')->nullable();

            // Foreign keys - only create if referenced tables exist
            if ($organizationsExists) {
                $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            }
            if ($academicYearsExists) {
                $table->foreign('academic_year_id')->references('id')->on('academic_years')->onDelete('set null');
            }
            if ($schoolBrandingExists) {
                $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');
            }
            if ($profilesExists) {
                $table->foreign('created_by')->references('id')->on('profiles')->onDelete('set null');
            }

            // Indexes for performance
            $table->index('organization_id');
            $table->index('academic_year_id');
            $table->index('school_id');
            $table->index('is_active');
            $table->index('deleted_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('generated_timetables');
    }
};

