<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('exam_paper_items')) {
            Schema::create('exam_paper_items', function (Blueprint $table) {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->uuid('organization_id');
                $table->uuid('school_id');
                
                // Required: link to the template
                $table->uuid('exam_paper_template_id');
                
                // Required: link to the question
                $table->uuid('question_id');
                
                // Section label (e.g., "A", "B", "Objective", "Subjective")
                $table->string('section_label', 50)->nullable();
                
                // Position within the template (for ordering)
                $table->integer('position')->default(0);
                
                // Override marks for this specific usage (null = use question.marks)
                $table->decimal('marks_override', 8, 2)->nullable();
                
                // Whether this question is mandatory in the paper
                $table->boolean('is_mandatory')->default(true);
                
                // Additional notes for this question in context of this paper
                $table->text('notes')->nullable();
                
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
                
                $table->foreign('exam_paper_template_id')
                    ->references('id')->on('exam_paper_templates')
                    ->onDelete('cascade');
                
                $table->foreign('question_id')
                    ->references('id')->on('questions')
                    ->onDelete('cascade');
                
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
                $table->index('exam_paper_template_id');
                $table->index('question_id');
                $table->index('position');
                $table->index('section_label');
                $table->index('deleted_at');
                $table->index(['exam_paper_template_id', 'position']);
                $table->index(['exam_paper_template_id', 'section_label']);
                
                // Unique constraint: same question can only appear once per template
                $table->unique(['exam_paper_template_id', 'question_id', 'deleted_at'], 'unique_template_question');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_paper_items');
    }
};
