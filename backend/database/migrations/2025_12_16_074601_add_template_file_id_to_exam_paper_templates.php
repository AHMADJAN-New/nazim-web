<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('exam_paper_templates') && !Schema::hasColumn('exam_paper_templates', 'template_file_id')) {
            Schema::table('exam_paper_templates', function (Blueprint $table) {
                // Add template_file_id column (nullable, foreign key to exam_paper_template_files)
                $table->uuid('template_file_id')->nullable()->after('language');
                
                // Foreign key
                $table->foreign('template_file_id')
                    ->references('id')->on('exam_paper_template_files')
                    ->onDelete('set null');
                
                // Index for performance
                $table->index('template_file_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('exam_paper_templates') && Schema::hasColumn('exam_paper_templates', 'template_file_id')) {
            Schema::table('exam_paper_templates', function (Blueprint $table) {
                $table->dropForeign(['template_file_id']);
                $table->dropIndex(['template_file_id']);
                $table->dropColumn('template_file_id');
            });
        }
    }
};
