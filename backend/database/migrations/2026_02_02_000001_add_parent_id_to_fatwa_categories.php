<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('website_fatwa_categories', function (Blueprint $table) {
            $table->uuid('parent_id')->nullable()->after('school_id');
            $table->index('parent_id');
        });
    }

    public function down(): void
    {
        Schema::table('website_fatwa_categories', function (Blueprint $table) {
            $table->dropColumn('parent_id');
        });
    }
};
