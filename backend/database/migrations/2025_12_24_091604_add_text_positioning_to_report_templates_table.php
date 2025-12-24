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
        Schema::table('report_templates', function (Blueprint $table) {
            $table->string('header_text_position', 20)->nullable()->after('header_text')->comment('Position of header text: above_school_name, below_school_name');
            $table->string('footer_text_position', 20)->nullable()->after('footer_text')->default('footer')->comment('Position of footer text: footer');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('report_templates', function (Blueprint $table) {
            $table->dropColumn(['header_text_position', 'footer_text_position']);
        });
    }
};
