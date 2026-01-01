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
        // Drop existing foreign keys if they exist
        Schema::table('maintenance_logs', function (Blueprint $table) {
            // Drop foreign keys (they might have different names)
            $table->dropForeign(['started_by']);
            $table->dropForeign(['ended_by']);
        });

        // Clean up invalid data (set to null if not a valid UUID that exists in profiles table)
        // This handles cases where the column might have invalid UUIDs or references non-existent profiles
        // We'll set to NULL any values that don't exist in the profiles table
        DB::statement("
            UPDATE maintenance_logs 
            SET started_by = NULL 
            WHERE started_by IS NOT NULL 
            AND NOT EXISTS (
                SELECT 1 FROM profiles WHERE profiles.id = maintenance_logs.started_by
            )
        ");

        DB::statement("
            UPDATE maintenance_logs 
            SET ended_by = NULL 
            WHERE ended_by IS NOT NULL 
            AND NOT EXISTS (
                SELECT 1 FROM profiles WHERE profiles.id = maintenance_logs.ended_by
            )
        ");

        // Add new foreign keys pointing to profiles.id
        Schema::table('maintenance_logs', function (Blueprint $table) {
            $table->foreign('started_by')->references('id')->on('profiles')->onDelete('set null');
            $table->foreign('ended_by')->references('id')->on('profiles')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('maintenance_logs', function (Blueprint $table) {
            $table->dropForeign(['started_by']);
            $table->dropForeign(['ended_by']);
        });

        // Restore old foreign keys (if needed)
        Schema::table('maintenance_logs', function (Blueprint $table) {
            $table->foreign('started_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('ended_by')->references('id')->on('users')->onDelete('set null');
        });
    }
};

