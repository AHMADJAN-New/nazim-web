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
        Schema::table('letter_templates', function (Blueprint $table) {
            $table->uuid('letterhead_id')->nullable()->after('school_id');
            $table->string('letter_type', 50)->nullable()->after('category');
            $table->string('template_file_path', 255)->nullable()->after('body_html');
            $table->string('template_file_type', 20)->default('html')->after('template_file_path');
            $table->jsonb('header_structure')->nullable()->after('variables');

            // Add foreign key for letterhead_id
            $table->foreign('letterhead_id')
                ->references('id')
                ->on('letterheads')
                ->onDelete('set null');

            // Add indexes
            $table->index('letter_type');
            $table->index('letterhead_id');
            $table->index(['letter_type', 'active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('letter_templates', function (Blueprint $table) {
            $table->dropForeign(['letterhead_id']);
            $table->dropIndex(['letter_type']);
            $table->dropIndex(['letterhead_id']);
            $table->dropIndex(['letter_type', 'active']);

            $table->dropColumn([
                'letterhead_id',
                'letter_type',
                'template_file_path',
                'template_file_type',
                'header_structure',
            ]);
        });
    }
};
