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
        if (!Schema::hasTable('exam_paper_template_files')) {
            Schema::create('exam_paper_template_files', function (Blueprint $table) {
                // UUID primary key
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                
                // Multi-tenancy: organization_id is required
                $table->uuid('organization_id');
                
                // Template file information
                $table->string('name', 255);
                $table->text('description')->nullable();
                
                // Template content
                $table->text('template_html'); // Full HTML template with placeholders
                $table->text('css_styles')->nullable(); // Additional CSS
                
                // Language: en, ps, fa, ar
                $table->string('language', 5)->default('en');
                
                // Default template for language
                $table->boolean('is_default')->default(false);
                
                // Active status
                $table->boolean('is_active')->default(true);
                
                // Timestamps
                $table->timestamps();
                $table->softDeletes();
                
                // Foreign keys
                $table->foreign('organization_id')
                    ->references('id')->on('organizations')
                    ->onDelete('cascade');
                
                // Indexes
                $table->index('organization_id');
                $table->index('language');
                $table->index('is_default');
                $table->index('is_active');
                $table->index('deleted_at');
                $table->index(['organization_id', 'language', 'is_default']);
                $table->index(['organization_id', 'language', 'is_active']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exam_paper_template_files');
    }
};
