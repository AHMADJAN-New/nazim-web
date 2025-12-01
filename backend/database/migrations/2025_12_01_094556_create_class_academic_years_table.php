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
        // Table already exists in Supabase, so we only create if it doesn't exist
        if (!Schema::hasTable('class_academic_years')) {
        Schema::create('class_academic_years', function (Blueprint $table) {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->uuid('class_id');
                $table->foreign('class_id')->references('id')->on('classes')->onDelete('cascade');
                $table->uuid('academic_year_id');
                $table->foreign('academic_year_id')->references('id')->on('academic_years')->onDelete('cascade');
                $table->uuid('organization_id')->nullable();
                $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
                $table->string('section_name', 50)->nullable();
                $table->uuid('teacher_id')->nullable();
                $table->foreign('teacher_id')->references('id')->on('profiles')->onDelete('set null');
                $table->uuid('room_id')->nullable();
                // Foreign key to rooms will be added later when rooms table exists
                // $table->foreign('room_id')->references('id')->on('rooms')->onDelete('set null');
                $table->integer('capacity')->nullable();
                $table->integer('current_student_count')->default(0);
                $table->boolean('is_active')->default(true);
                $table->text('notes')->nullable();
            $table->timestamps();
                $table->softDeletes();

                // Unique constraint: one section per class per academic year
                // Note: Laravel doesn't support COALESCE in unique, so we'll handle this in application logic
                $table->unique(['class_id', 'academic_year_id', 'section_name'], 'idx_class_academic_years_unique_section');
                
                // Indexes
                $table->index('class_id');
                $table->index('academic_year_id');
                $table->index('organization_id');
                $table->index('teacher_id');
                $table->index('room_id');
                $table->index('is_active');
                $table->index('deleted_at');
        });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('class_academic_years');
    }
};
