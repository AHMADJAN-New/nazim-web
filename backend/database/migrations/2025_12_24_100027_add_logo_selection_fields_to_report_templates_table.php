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
            // Logo selection (which logos to show in reports) - same as school_branding
            $table->boolean('show_primary_logo')->default(true)->after('report_logo_selection');
            $table->boolean('show_secondary_logo')->default(false)->after('show_primary_logo');
            $table->boolean('show_ministry_logo')->default(false)->after('show_secondary_logo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('report_templates', function (Blueprint $table) {
            $table->dropColumn([
                'show_primary_logo',
                'show_secondary_logo',
                'show_ministry_logo',
            ]);
        });
    }
};
