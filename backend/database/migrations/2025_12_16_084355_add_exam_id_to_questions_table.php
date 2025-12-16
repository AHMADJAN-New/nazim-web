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
        Schema::table('questions', function (Blueprint $table) {
            // Add exam_id column (nullable - questions can be generic or exam-specific)
            $table->uuid('exam_id')->nullable()->after('class_academic_year_id');
            
            // Add foreign key constraint
            $table->foreign('exam_id')
                ->references('id')
                ->on('exams')
                ->onDelete('set null');
            
            // Add index for performance
            $table->index('exam_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->dropForeign(['exam_id']);
            $table->dropIndex(['exam_id']);
            $table->dropColumn('exam_id');
        });
    }
};
