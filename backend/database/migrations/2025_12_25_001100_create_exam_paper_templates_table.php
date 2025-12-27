<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('exam_paper_templates')) {
            Schema::create('exam_paper_templates', function (Blueprint $table) {
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                $table->uuid('organization_id');
                $table->uuid('school_id');
                
                // Optional: link to specific exam (null = generic template for subject/class)
                $table->uuid('exam_id')->nullable();
                
                // Optional: link to specific exam_subject (when tied to a specific exam_subject)
                $table->uuid('exam_subject_id')->nullable();
                
                // Required: subject this template is for
                $table->uuid('subject_id');
                
                // Optional: class academic year (for class-specific templates)
                $table->uuid('class_academic_year_id')->nullable();
                
                // Template title (e.g., "Mid-Term Fiqh Paper – Class 3")
                $table->string('title', 255);
                
                // Language: ps (Pashto), fa (Farsi), ar (Arabic), en (English)
                $table->string('language', 5)->default('en');
                
                // Total marks (can be derived from items if null)
                $table->decimal('total_marks', 8, 2)->nullable();
                
                // Duration in minutes
                $table->integer('duration_minutes')->nullable();
                
                // Header HTML for printing
                $table->text('header_html')->nullable();
                
                // Footer HTML for printing
                $table->text('footer_html')->nullable();
                
                // Instructions for students
                $table->text('instructions')->nullable();
                
                // Print tracking fields
                $table->string('print_status', 255)->default('not_printed');
                $table->timestamp('printed_at')->nullable();
                $table->uuid('printed_by')->nullable();
                $table->text('print_notes')->nullable();

                // Whether this is the default template for the exam_subject
                $table->boolean('is_default_for_exam_subject')->default(false);
                
                // Whether template is active
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
                
                $table->foreign('exam_id')
                    ->references('id')->on('exams')
                    ->onDelete('cascade');
                
                $table->foreign('exam_subject_id')
                    ->references('id')->on('exam_subjects')
                    ->onDelete('cascade');
                
                $table->foreign('subject_id')
                    ->references('id')->on('subjects')
                    ->onDelete('cascade');
                
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

                $table->foreign('printed_by')
                    ->references('id')->on('profiles')
                    ->onDelete('set null');
                
                // Indexes for common queries
                $table->index('organization_id');
                $table->index('school_id');
                $table->index('exam_id');
                $table->index('exam_subject_id');
                $table->index('subject_id');
                $table->index('class_academic_year_id');
                $table->index('print_status');
                $table->index('is_default_for_exam_subject');
                $table->index('is_active');
                $table->index('deleted_at');
                $table->index(['organization_id', 'school_id', 'subject_id']);
                $table->index(['organization_id', 'school_id', 'exam_id']);
                $table->index(['exam_subject_id', 'is_default_for_exam_subject']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_paper_templates');
    }
};
