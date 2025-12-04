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
                $table->integer('capacity')->nullable();
                $table->integer('current_student_count')->default(0);
                $table->boolean('is_active')->default(true);
                $table->text('notes')->nullable();
            $table->timestamps();
                $table->softDeletes();
                
                // Indexes
                $table->index('class_id');
                $table->index('academic_year_id');
                $table->index('organization_id');
                $table->index('teacher_id');
                $table->index('room_id');
                $table->index('is_active');
                $table->index('deleted_at');
        });

        // Create a unique index that properly handles NULL section_name
        // PostgreSQL treats NULL as distinct, so we use a partial unique index
        // This ensures: one NULL section per class+year, and unique non-NULL sections
        DB::statement('
            CREATE UNIQUE INDEX idx_class_academic_years_unique_section 
            ON class_academic_years (class_id, academic_year_id, section_name)
            WHERE deleted_at IS NULL
        ');

        // Add room_id foreign key constraint if rooms table exists
        if (Schema::hasTable('rooms')) {
            Schema::table('class_academic_years', function (Blueprint $table) {
                $table->foreign('room_id')->references('id')->on('rooms')->onDelete('set null');
            });
        }
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
