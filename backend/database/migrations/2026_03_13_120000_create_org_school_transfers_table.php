<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Option B: Formal org-to-school transfer linking org expense and school income.
     */
    public function up(): void
    {
        Schema::create('org_school_transfers', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->uuid('org_account_id');
            $table->uuid('school_account_id');
            $table->uuid('currency_id');
            $table->decimal('amount', 15, 2);
            $table->date('transfer_date');
            $table->string('reference_no', 100)->nullable();
            $table->text('notes')->nullable();
            $table->string('status', 20)->default('completed'); // pending, completed, cancelled
            $table->uuid('org_expense_entry_id');
            $table->uuid('school_income_entry_id');
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
            $table->foreign('org_account_id')->references('id')->on('finance_accounts')->onDelete('restrict');
            $table->foreign('school_account_id')->references('id')->on('finance_accounts')->onDelete('restrict');
            $table->foreign('currency_id')->references('id')->on('currencies')->onDelete('restrict');
            $table->foreign('org_expense_entry_id')->references('id')->on('expense_entries')->onDelete('restrict');
            $table->foreign('school_income_entry_id')->references('id')->on('income_entries')->onDelete('restrict');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');

            $table->index('organization_id');
            $table->index('school_id');
            $table->index('transfer_date');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('org_school_transfers');
    }
};
