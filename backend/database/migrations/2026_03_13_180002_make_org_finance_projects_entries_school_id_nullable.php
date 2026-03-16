<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Make school_id nullable on finance_projects, income_entries, expense_entries
     * for org-finance. For DBs that ran the original 180001 (only categories),
     * this completes the set. Safe to run if already nullable.
     */
    public function up(): void
    {
        foreach (['finance_projects', 'income_entries', 'expense_entries'] as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'school_id')) {
                DB::statement("ALTER TABLE public.{$table} ALTER COLUMN school_id DROP NOT NULL");
            }
        }
    }

    public function down(): void
    {
        foreach (['finance_projects', 'income_entries', 'expense_entries'] as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'school_id')) {
                $nullCount = DB::table($table)->whereNull('school_id')->count();
                if ($nullCount === 0) {
                    DB::statement("ALTER TABLE public.{$table} ALTER COLUMN school_id SET NOT NULL");
                }
            }
        }
    }
};
