<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ensure template_file_id exists on exam_paper_templates.
     *
     * The earlier add_template_file_id migration could run before the table
     * was created, leaving existing databases without this column.
     */
    public function up(): void
    {
        if (! Schema::hasTable('exam_paper_templates')) {
            return;
        }

        if (Schema::hasColumn('exam_paper_templates', 'template_file_id')) {
            return;
        }

        Schema::table('exam_paper_templates', function (Blueprint $table) {
            $table->uuid('template_file_id')->nullable()->after('language');

            if (Schema::hasTable('exam_paper_template_files')) {
                $table->foreign('template_file_id')
                    ->references('id')->on('exam_paper_template_files')
                    ->onDelete('set null');
            }

            $table->index('template_file_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('exam_paper_templates')) {
            return;
        }

        if (! Schema::hasColumn('exam_paper_templates', 'template_file_id')) {
            return;
        }

        Schema::table('exam_paper_templates', function (Blueprint $table) {
            if (Schema::hasTable('exam_paper_template_files')) {
                $table->dropForeign(['template_file_id']);
            }

            $table->dropIndex(['template_file_id']);
            $table->dropColumn('template_file_id');
        });
    }
};
