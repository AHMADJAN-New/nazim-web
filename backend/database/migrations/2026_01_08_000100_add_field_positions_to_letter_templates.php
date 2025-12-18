<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds field_positions JSONB column to store text block positions for letter templates.
     * Each positioned block includes: id, type, x, y, width, height, content, styles
     */
    public function up(): void
    {
        Schema::table('letter_templates', function (Blueprint $table) {
            $table->jsonb('field_positions')->nullable()->after('header_structure');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('letter_templates', function (Blueprint $table) {
            $table->dropColumn('field_positions');
        });
    }
};
