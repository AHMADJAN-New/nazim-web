<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Link expense and income entries to org_facilities for per-facility reporting.
     */
    public function up(): void
    {
        Schema::table('expense_entries', function (Blueprint $table) {
            $table->uuid('facility_id')->nullable()->after('project_id');
            $table->foreign('facility_id')->references('id')->on('org_facilities')->onDelete('set null');
            $table->index('facility_id');
        });

        Schema::table('income_entries', function (Blueprint $table) {
            $table->uuid('facility_id')->nullable()->after('project_id');
            $table->foreign('facility_id')->references('id')->on('org_facilities')->onDelete('set null');
            $table->index('facility_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('expense_entries', function (Blueprint $table) {
            $table->dropForeign(['facility_id']);
            $table->dropIndex(['facility_id']);
            $table->dropColumn('facility_id');
        });

        Schema::table('income_entries', function (Blueprint $table) {
            $table->dropForeign(['facility_id']);
            $table->dropIndex(['facility_id']);
            $table->dropColumn('facility_id');
        });
    }
};
