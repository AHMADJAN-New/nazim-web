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
        Schema::table('letterheads', function (Blueprint $table) {
            // Change position to letterhead_type (background | watermark)
            $table->enum('letterhead_type', ['background', 'watermark'])
                ->default('background')
                ->after('file_type');

            // Drop the old position column if it exists
            if (Schema::hasColumn('letterheads', 'position')) {
                $table->dropColumn('position');
            }

            // Drop default_for_layout as it's not needed
            if (Schema::hasColumn('letterheads', 'default_for_layout')) {
                $table->dropColumn('default_for_layout');
            }
        });

        Schema::table('letter_templates', function (Blueprint $table) {
            // Add watermark_id foreign key
            $table->uuid('watermark_id')->nullable()->after('letterhead_id');
            $table->foreign('watermark_id')
                ->references('id')
                ->on('letterheads')
                ->onDelete('set null');

            // Add body_text for plain text with placeholders
            $table->longText('body_text')->nullable()->after('letter_type');

            // Add table support fields
            $table->boolean('supports_tables')->default(false)->after('variables');
            $table->jsonb('table_structure')->nullable()->after('supports_tables');

            // Add multi-page letterhead repeat option
            $table->boolean('repeat_letterhead_on_pages')->default(true)->after('page_layout');

            // Drop old HTML-based fields
            if (Schema::hasColumn('letter_templates', 'body_html')) {
                $table->dropColumn('body_html');
            }
            if (Schema::hasColumn('letter_templates', 'allow_edit_body')) {
                $table->dropColumn('allow_edit_body');
            }
            if (Schema::hasColumn('letter_templates', 'header_structure')) {
                $table->dropColumn('header_structure');
            }
            if (Schema::hasColumn('letter_templates', 'template_file_path')) {
                $table->dropColumn('template_file_path');
            }
            if (Schema::hasColumn('letter_templates', 'template_file_type')) {
                $table->dropColumn('template_file_type');
            }

            // Add indexes for better performance
            $table->index('watermark_id');
            $table->index('supports_tables');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('letter_templates', function (Blueprint $table) {
            // Drop new columns
            $table->dropForeign(['watermark_id']);
            $table->dropColumn([
                'watermark_id',
                'body_text',
                'supports_tables',
                'table_structure',
                'repeat_letterhead_on_pages'
            ]);

            // Restore old columns
            $table->longText('body_html')->nullable();
            $table->boolean('allow_edit_body')->default(false);
            $table->jsonb('header_structure')->nullable();
            $table->string('template_file_path')->nullable();
            $table->string('template_file_type')->default('html');
        });

        Schema::table('letterheads', function (Blueprint $table) {
            // Restore old columns
            $table->string('position')->default('header');
            $table->string('default_for_layout')->nullable();

            // Drop new column
            $table->dropColumn('letterhead_type');
        });
    }
};
