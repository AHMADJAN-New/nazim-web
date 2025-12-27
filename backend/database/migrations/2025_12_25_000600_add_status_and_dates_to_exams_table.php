<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

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
        if (!Schema::hasTable('exams')) {
            return;
        }

        Schema::table('exams', function (Blueprint $table) {
            // Exam period dates - only add if they don't exist
            if (!Schema::hasColumn('exams', 'start_date')) {
                $table->date('start_date')->nullable()->after('description');
            }
            if (!Schema::hasColumn('exams', 'end_date')) {
                $table->date('end_date')->nullable()->after('start_date');
            }
            
            // Exam status for lifecycle management - only add if it doesn't exist
            // Allowed values: draft, scheduled, in_progress, completed, archived
            if (!Schema::hasColumn('exams', 'status')) {
                $table->string('status', 50)->default('draft')->after('end_date');
            }
        });

        // Add indexes only if they don't exist
        if (Schema::hasColumn('exams', 'status')) {
            // Check if index exists before creating
            $indexes = DB::select("
                SELECT indexname 
                FROM pg_indexes 
                WHERE tablename = 'exams' 
                AND indexname IN ('exams_status_index', 'exams_organization_id_status_index', 'exams_organization_id_academic_year_id_status_index')
            ");
            $existingIndexNames = array_column($indexes, 'indexname');

            if (!in_array('exams_status_index', $existingIndexNames)) {
                Schema::table('exams', function (Blueprint $table) {
                    $table->index('status');
                });
            }
            if (!in_array('exams_organization_id_status_index', $existingIndexNames)) {
                Schema::table('exams', function (Blueprint $table) {
                    $table->index(['organization_id', 'status']);
                });
            }
            if (!in_array('exams_organization_id_academic_year_id_status_index', $existingIndexNames)) {
                Schema::table('exams', function (Blueprint $table) {
                    $table->index(['organization_id', 'academic_year_id', 'status']);
                });
            }
        }
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
