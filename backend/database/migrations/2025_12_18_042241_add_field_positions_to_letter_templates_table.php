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
            // Add field_positions JSONB column for storing absolute positions of text blocks
            // Format: { "block-1": { "x": 50, "y": 30, "fontSize": 14, "fontFamily": "Arial" }, ... }
            $table->jsonb('field_positions')->nullable()->after('body_text');
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
