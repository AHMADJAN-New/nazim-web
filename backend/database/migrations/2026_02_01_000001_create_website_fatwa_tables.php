<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('website_fatwa_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->string('name', 200);
            $table->string('slug', 200);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index('organization_id');
            $table->index('school_id');
            $table->index(['school_id', 'slug']);
        });

        Schema::create('website_fatwa_tags', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->string('name', 200);
            $table->string('slug', 200);
            $table->timestamps();
            $table->softDeletes();

            $table->index('organization_id');
            $table->index('school_id');
            $table->index(['school_id', 'slug']);
        });

        Schema::create('website_fatwas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->uuid('category_id')->nullable();
            $table->string('slug', 200);
            $table->string('title', 255);
            $table->text('question_text')->nullable();
            $table->longText('answer_text')->nullable();
            $table->json('references_json')->nullable();
            $table->string('status', 30)->default('draft');
            $table->timestamp('published_at')->nullable();
            $table->boolean('is_featured')->default(false);
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('organization_id');
            $table->index('school_id');
            $table->index(['school_id', 'slug']);
            $table->index(['school_id', 'status']);
        });

        Schema::create('website_fatwa_questions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->uuid('category_id')->nullable();
            $table->string('name', 200)->nullable();
            $table->string('email', 200)->nullable();
            $table->string('phone', 80)->nullable();
            $table->text('question_text');
            $table->boolean('is_anonymous')->default(false);
            $table->string('status', 30)->default('new');
            $table->timestamp('submitted_at')->nullable();
            $table->uuid('assigned_to')->nullable();
            $table->text('internal_notes')->nullable();
            $table->longText('answer_draft')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('organization_id');
            $table->index('school_id');
            $table->index(['school_id', 'status']);
        });

        Schema::create('website_fatwa_assignments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('fatwa_question_id');
            $table->uuid('assigned_to');
            $table->uuid('assigned_by')->nullable();
            $table->timestamp('assigned_at')->nullable();
            $table->timestamps();

            $table->index('fatwa_question_id');
            $table->index('assigned_to');
        });

        Schema::create('website_fatwa_activity_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('fatwa_question_id');
            $table->string('action', 60);
            $table->text('note')->nullable();
            $table->uuid('performed_by')->nullable();
            $table->timestamps();

            $table->index('fatwa_question_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('website_fatwa_activity_logs');
        Schema::dropIfExists('website_fatwa_assignments');
        Schema::dropIfExists('website_fatwa_questions');
        Schema::dropIfExists('website_fatwas');
        Schema::dropIfExists('website_fatwa_tags');
        Schema::dropIfExists('website_fatwa_categories');
    }
};
