<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Link expense_entries to payroll_runs for payroll-paid expense creation.
     * One expense per payroll run (enforced by partial unique index).
     */
    public function up(): void
    {
        if (!Schema::hasTable('expense_entries') || !Schema::hasTable('payroll_runs')) {
            return;
        }

        Schema::table('expense_entries', function (Blueprint $table) {
            $table->uuid('payroll_run_id')->nullable()->after('project_id');
            $table->foreign('payroll_run_id')->references('id')->on('payroll_runs')->onDelete('set null');
        });

        DB::statement(
            'CREATE UNIQUE INDEX expense_entries_payroll_run_id_unique ON public.expense_entries (payroll_run_id) WHERE payroll_run_id IS NOT NULL AND deleted_at IS NULL'
        );
    }

    public function down(): void
    {
        if (!Schema::hasTable('expense_entries')) {
            return;
        }
        DB::statement('DROP INDEX IF EXISTS public.expense_entries_payroll_run_id_unique');
        Schema::table('expense_entries', function (Blueprint $table) {
            $table->dropForeign(['payroll_run_id']);
            $table->dropColumn('payroll_run_id');
        });
    }
};
