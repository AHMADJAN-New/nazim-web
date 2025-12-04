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
        if (!Schema::hasTable('class_subjects')) {
            Schema::create('class_subjects', function (Blueprint $table) {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->uuid('class_subject_template_id')->nullable();
                $table->uuid('class_academic_year_id');
                $table->foreign('class_academic_year_id')->references('id')->on('class_academic_years')->onDelete('cascade');
                $table->uuid('subject_id');
                $table->foreign('subject_id')->references('id')->on('subjects')->onDelete('cascade');
                $table->uuid('organization_id')->nullable();
                $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
                $table->uuid('teacher_id')->nullable();
                $table->foreign('teacher_id')->references('id')->on('profiles')->onDelete('set null');
                $table->uuid('room_id')->nullable();
                // Foreign key for room_id - add conditionally if rooms table exists
                if (Schema::hasTable('rooms')) {
                    $table->foreign('room_id')->references('id')->on('rooms')->onDelete('set null');
                }
                $table->integer('credits')->nullable();
                $table->integer('hours_per_week')->nullable();
                $table->boolean('is_required')->default(true);
                $table->text('notes')->nullable();
                $table->timestamps();
                $table->softDeletes();

                // Indexes
                $table->index('class_subject_template_id');
                $table->index('class_academic_year_id');
                $table->index('subject_id');
                $table->index('organization_id');
                $table->index('teacher_id');
                $table->index('room_id');
                $table->index('is_required');
                $table->index('deleted_at');

            });

            // Create partial unique index for soft deletes
            DB::statement('
                CREATE UNIQUE INDEX IF NOT EXISTS idx_class_subjects_unique 
                ON class_subjects (class_academic_year_id, subject_id) 
                WHERE deleted_at IS NULL
            ');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('class_subjects');
    }
};
