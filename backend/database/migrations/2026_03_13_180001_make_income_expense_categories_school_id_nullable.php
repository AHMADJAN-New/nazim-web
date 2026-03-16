<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Make school_id nullable on all org-finance tables so organization-level
     * rows (school_id = null) can exist. The backfill migration set these to
     * NOT NULL; this restores nullable for org-scoped finance.
     *
     * Tables: finance_accounts, donors, currencies, exchange_rates,
     * income_categories, expense_categories, finance_projects,
     * income_entries, expense_entries.
     */
    public function up(): void
    {
        $tables = [
            'finance_accounts',
            'donors',
            'currencies',
            'exchange_rates',
            'income_categories',
            'expense_categories',
            'finance_projects',
            'income_entries',
            'expense_entries',
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'school_id')) {
                DB::statement("ALTER TABLE public.{$table} ALTER COLUMN school_id DROP NOT NULL");
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $tables = [
            'finance_accounts',
            'donors',
            'currencies',
            'exchange_rates',
            'income_categories',
            'expense_categories',
            'finance_projects',
            'income_entries',
            'expense_entries',
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'school_id')) {
                $nullCount = DB::table($table)->whereNull('school_id')->count();
                if ($nullCount === 0) {
                    DB::statement("ALTER TABLE public.{$table} ALTER COLUMN school_id SET NOT NULL");
                }
            }
        }
    }
};
