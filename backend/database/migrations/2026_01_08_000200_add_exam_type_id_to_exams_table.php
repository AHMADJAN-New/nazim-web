<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exams', function (Blueprint $table) {
            $table->uuid('exam_type_id')->nullable()->after('academic_year_id');
            $table->foreign('exam_type_id')->references('id')->on('exam_types')->onDelete('set null');
            $table->index('exam_type_id');
        });
    }

    public function down(): void
    {
        Schema::table('exams', function (Blueprint $table) {
            $table->dropForeign(['exam_type_id']);
            $table->dropIndex(['exam_type_id']);
            $table->dropColumn('exam_type_id');
        });
    }
};

