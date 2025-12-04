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
        if (!Schema::hasTable('class_subject_templates')) {
            Schema::create('class_subject_templates', function (Blueprint $table) {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->uuid('class_id');
                $table->foreign('class_id')->references('id')->on('classes')->onDelete('cascade');
                $table->uuid('subject_id');
                $table->foreign('subject_id')->references('id')->on('subjects')->onDelete('cascade');
                $table->uuid('organization_id')->nullable();
                $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
                $table->boolean('is_required')->default(true);
                $table->integer('credits')->nullable();
                $table->integer('hours_per_week')->nullable();
                $table->timestamps();
                $table->softDeletes();

                // Indexes
                $table->index('class_id');
                $table->index('subject_id');
                $table->index('organization_id');
                $table->index('deleted_at');
            });

            // Unique constraint: one subject per class (excluding soft deletes)
            // Must be created after the table exists
            DB::statement('
                CREATE UNIQUE INDEX IF NOT EXISTS idx_class_subject_templates_unique 
                ON class_subject_templates (class_id, subject_id) 
                WHERE deleted_at IS NULL
            ');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('class_subject_templates');
    }
};
