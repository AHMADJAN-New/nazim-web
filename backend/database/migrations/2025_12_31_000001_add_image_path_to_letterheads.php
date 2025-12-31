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
        Schema::table('letterheads', function (Blueprint $table) {
            $table->string('image_path', 255)->nullable()->after('file_path');
            $table->index('image_path');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('letterheads', function (Blueprint $table) {
            $table->dropIndex(['image_path']);
            $table->dropColumn('image_path');
        });
    }
};
