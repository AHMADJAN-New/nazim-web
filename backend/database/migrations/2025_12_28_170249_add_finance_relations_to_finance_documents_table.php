<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('finance_documents', function (Blueprint $table) {
            // Add new foreign key columns
            $table->uuid('donor_id')->nullable()->after('staff_id');
            $table->uuid('project_id')->nullable()->after('donor_id');
            $table->uuid('income_entry_id')->nullable()->after('project_id');
            $table->uuid('expense_entry_id')->nullable()->after('income_entry_id');
            $table->uuid('account_id')->nullable()->after('expense_entry_id');

            // Add foreign keys
            $table->foreign('donor_id')->references('id')->on('donors')->onDelete('set null');
            $table->foreign('project_id')->references('id')->on('finance_projects')->onDelete('set null');
            $table->foreign('income_entry_id')->references('id')->on('income_entries')->onDelete('set null');
            $table->foreign('expense_entry_id')->references('id')->on('expense_entries')->onDelete('set null');
            $table->foreign('account_id')->references('id')->on('finance_accounts')->onDelete('set null');

            // Add indexes
            $table->index('donor_id');
            $table->index('project_id');
            $table->index('income_entry_id');
            $table->index('expense_entry_id');
            $table->index('account_id');
        });
    }

    public function down(): void
    {
        Schema::table('finance_documents', function (Blueprint $table) {
            // Drop foreign keys
            $table->dropForeign(['donor_id']);
            $table->dropForeign(['project_id']);
            $table->dropForeign(['income_entry_id']);
            $table->dropForeign(['expense_entry_id']);
            $table->dropForeign(['account_id']);

            // Drop indexes
            $table->dropIndex(['donor_id']);
            $table->dropIndex(['project_id']);
            $table->dropIndex(['income_entry_id']);
            $table->dropIndex(['expense_entry_id']);
            $table->dropIndex(['account_id']);

            // Drop columns
            $table->dropColumn(['donor_id', 'project_id', 'income_entry_id', 'expense_entry_id', 'account_id']);
        });
    }
};
