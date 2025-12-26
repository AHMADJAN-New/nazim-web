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
        Schema::table('school_branding', function (Blueprint $table) {
            // Logo selection (which logos to show in reports)
            $table->boolean('show_primary_logo')->default(true)->after('report_logo_selection');
            $table->boolean('show_secondary_logo')->default(false)->after('show_primary_logo');
            $table->boolean('show_ministry_logo')->default(false)->after('show_secondary_logo');
            
            // Logo positioning (left or right)
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
        Schema::table('school_branding', function (Blueprint $table) {
            $table->dropColumn([
                'show_primary_logo',
                'show_secondary_logo',
                'show_ministry_logo',
                'primary_logo_position',
                'secondary_logo_position',
                'ministry_logo_position',
            ]);
        });
    }
};
