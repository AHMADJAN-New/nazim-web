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
     * Add currency_id to finance tables for multi-currency support
     */
    public function up(): void
    {
        // Add currency_id to finance_accounts
        Schema::table('finance_accounts', function (Blueprint $table) {
            $table->uuid('currency_id')->nullable()->after('organization_id');
            $table->foreign('currency_id')->references('id')->on('currencies')->onDelete('restrict');
            $table->index('currency_id');
        });

        // Add currency_id to income_entries
        Schema::table('income_entries', function (Blueprint $table) {
            $table->uuid('currency_id')->nullable()->after('organization_id');
            $table->foreign('currency_id')->references('id')->on('currencies')->onDelete('restrict');
            $table->index('currency_id');
        });

        // Add currency_id to expense_entries
        Schema::table('expense_entries', function (Blueprint $table) {
            $table->uuid('currency_id')->nullable()->after('organization_id');
            $table->foreign('currency_id')->references('id')->on('currencies')->onDelete('restrict');
            $table->index('currency_id');
        });

        // Add currency_id to finance_projects
        Schema::table('finance_projects', function (Blueprint $table) {
            $table->uuid('currency_id')->nullable()->after('organization_id');
            $table->foreign('currency_id')->references('id')->on('currencies')->onDelete('restrict');
            $table->index('currency_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove currency_id from finance_projects
        Schema::table('finance_projects', function (Blueprint $table) {
            $table->dropForeign(['currency_id']);
            $table->dropIndex(['currency_id']);
            $table->dropColumn('currency_id');
        });

        // Remove currency_id from expense_entries
        Schema::table('expense_entries', function (Blueprint $table) {
            $table->dropForeign(['currency_id']);
            $table->dropIndex(['currency_id']);
            $table->dropColumn('currency_id');
        });

        // Remove currency_id from income_entries
        Schema::table('income_entries', function (Blueprint $table) {
            $table->dropForeign(['currency_id']);
            $table->dropIndex(['currency_id']);
            $table->dropColumn('currency_id');
        });

        // Remove currency_id from finance_accounts
        Schema::table('finance_accounts', function (Blueprint $table) {
            $table->dropForeign(['currency_id']);
            $table->dropIndex(['currency_id']);
            $table->dropColumn('currency_id');
        });
    }
};
