<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Adds start_date, end_date, and status columns to the exams table
     * to support exam lifecycle management.
     */
    public function up(): void
    {
        Schema::table('exams', function (Blueprint $table) {
            // Exam period dates
            $table->date('start_date')->nullable()->after('description');
            $table->date('end_date')->nullable()->after('start_date');
            
            // Exam status for lifecycle management
            // Allowed values: draft, scheduled, in_progress, completed, archived
            $table->string('status', 50)->default('draft')->after('end_date');
            
            // Add index for status-based queries
            $table->index('status');
            $table->index(['organization_id', 'status']);
            $table->index(['organization_id', 'academic_year_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('exams', function (Blueprint $table) {
            $table->dropIndex(['organization_id', 'academic_year_id', 'status']);
            $table->dropIndex(['organization_id', 'status']);
            $table->dropIndex(['exams_status_index']);
            $table->dropColumn(['start_date', 'end_date', 'status']);
        });
    }
};
