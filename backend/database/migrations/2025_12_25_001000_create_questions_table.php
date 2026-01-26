<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('questions')) {
            Schema::create('questions', function (Blueprint $table) {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->uuid('organization_id');
                $table->uuid('school_id');
                $table->uuid('subject_id');
                $table->uuid('exam_id')->nullable();
                $table->uuid('class_academic_year_id')->nullable();
                
                // Question type: mcq, short, descriptive, true_false, essay
                $table->string('type', 20);
                
                // Difficulty: easy, medium, hard
                $table->string('difficulty', 10)->default('medium');
                
                // Marks for this question
                $table->decimal('marks', 8, 2)->default(1);
                
                // Main question text (stem)
                $table->text('text');
                
                // Whether text is RTL (for Pashto/Arabic)
                $table->boolean('text_rtl')->default(false);
                
                // Options for MCQ/True-False: JSON array of {id, label, text, is_correct}
                $table->jsonb('options')->nullable();
                
                // Correct answer for non-MCQ types (short/true_false)
                $table->text('correct_answer')->nullable();
                
                // Reference: topic, chapter, page
                $table->string('reference', 255)->nullable();
                
                // Tags for categorization
                $table->jsonb('tags')->nullable();
                
                // Whether question is active
                $table->boolean('is_active')->default(true);
                
                // Audit fields
                $table->uuid('created_by')->nullable();
                $table->uuid('updated_by')->nullable();
                $table->uuid('deleted_by')->nullable();
                
                $table->timestamps();
                $table->softDeletes();
                
                // Foreign keys
                $table->foreign('organization_id')
                    ->references('id')->on('organizations')
                    ->onDelete('cascade');
                
                $table->foreign('school_id')
                    ->references('id')->on('school_branding')
                    ->onDelete('cascade');
                
                $table->foreign('subject_id')
                    ->references('id')->on('subjects')
                    ->onDelete('cascade');

                $table->foreign('exam_id')
                    ->references('id')->on('exams')
                    ->onDelete('set null');
                
                $table->foreign('class_academic_year_id')
                    ->references('id')->on('class_academic_years')
                    ->onDelete('set null');
                
                $table->foreign('created_by')
                    ->references('id')->on('profiles')
                    ->onDelete('set null');
                
                $table->foreign('updated_by')
                    ->references('id')->on('profiles')
                    ->onDelete('set null');
                
                $table->foreign('deleted_by')
                    ->references('id')->on('profiles')
                    ->onDelete('set null');
                
                // Indexes for common queries
                $table->index('organization_id');
                $table->index('school_id');
                $table->index('subject_id');
                $table->index('exam_id');
                $table->index('class_academic_year_id');
                $table->index('type');
                $table->index('difficulty');
                $table->index('is_active');
                $table->index('deleted_at');
                $table->index('created_at'); // For ORDER BY created_at DESC
                $table->index('created_by'); // For filtering by creator
                
                // Composite indexes for common query patterns
                // Most common: organization + school + deleted_at + created_at (for listing)
                $table->index(['organization_id', 'school_id', 'deleted_at', 'created_at'], 'idx_questions_org_school_active_created');
                
                // Filter by organization + school + subject
                $table->index(['organization_id', 'school_id', 'subject_id']);
                
                // Filter by organization + school + class_academic_year
                $table->index(['organization_id', 'school_id', 'class_academic_year_id']);
                
                // Filter by organization + school + subject + type + difficulty
                $table->index(['organization_id', 'school_id', 'subject_id', 'type', 'difficulty'], 'idx_questions_org_school_subject_type_diff');
                
                // Filter by organization + school + is_active + deleted_at
                $table->index(['organization_id', 'school_id', 'is_active', 'deleted_at'], 'idx_questions_org_school_active_status');
            });
            
            // GIN index for JSONB tags column (for search scope using whereJsonContains)
            // Must be created separately as Laravel doesn't support GIN indexes directly
            DB::statement('CREATE INDEX idx_questions_tags_gin ON questions USING gin (tags)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('questions');
    }
};
