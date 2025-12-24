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
            // Logo positioning (left or right) - same as school_branding
            $table->string('primary_logo_position', 10)->default('left')->after('show_ministry_logo'); // 'left' or 'right'
            $table->string('secondary_logo_position', 10)->nullable()->after('primary_logo_position');
            $table->string('ministry_logo_position', 10)->nullable()->after('secondary_logo_position');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('report_templates', function (Blueprint $table) {
            $table->dropColumn([
                'primary_logo_position',
                'secondary_logo_position',
                'ministry_logo_position',
            ]);
        });
    }
};
