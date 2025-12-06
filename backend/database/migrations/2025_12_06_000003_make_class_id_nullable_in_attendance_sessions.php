<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('attendance_sessions', function (Blueprint $table) {
            // Make class_id nullable to support multiple classes via pivot table
            $table->uuid('class_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Before making it NOT NULL, ensure all sessions have a class_id
        // This is a destructive operation, so we'll just make it nullable again
        Schema::table('attendance_sessions', function (Blueprint $table) {
            $table->uuid('class_id')->nullable(false)->change();
        });
    }
};
