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
        if (Schema::hasTable('document_files')) {
            Schema::table('document_files', function (Blueprint $table) {
                $table->unsignedBigInteger('size_bytes')->nullable()->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('document_files')) {
            Schema::table('document_files', function (Blueprint $table) {
                // Set default to 0 for existing NULL values before making it NOT NULL
                \DB::statement('UPDATE document_files SET size_bytes = 0 WHERE size_bytes IS NULL');
                $table->unsignedBigInteger('size_bytes')->default(0)->change();
            });
        }
    }
};
