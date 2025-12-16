<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exam_paper_items', function (Blueprint $table) {
            // Number of answer lines to show (null = use default based on question type)
            $table->integer('answer_lines_count')->nullable()->after('marks_override');
            
            // Whether to show answer lines (null = use default, true/false = override)
            $table->boolean('show_answer_lines')->nullable()->after('answer_lines_count');
        });
    }

    public function down(): void
    {
        Schema::table('exam_paper_items', function (Blueprint $table) {
            $table->dropColumn(['answer_lines_count', 'show_answer_lines']);
        });
    }
};
