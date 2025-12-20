<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Increase counter_type column length from 50 to 100 characters
     * to accommodate certificate counter types that include UUIDs and years.
     * Example: certificate_graduation_d7eb1a0a-cf25-4276-982a-16c2708a380f_2025 (63 chars)
     */
    public function up(): void
    {
        Schema::table('organization_counters', function (Blueprint $table) {
            $table->string('counter_type', 100)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('organization_counters', function (Blueprint $table) {
            $table->string('counter_type', 50)->change();
        });
    }
};
