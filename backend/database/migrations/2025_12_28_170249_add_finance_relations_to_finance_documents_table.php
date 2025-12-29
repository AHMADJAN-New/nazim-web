<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Check if columns already exist (they were added in the initial migration)
        // This migration is kept for backward compatibility but is now idempotent
        if (!Schema::hasTable('finance_documents')) {
            return; // Table doesn't exist, skip
        }

        // If all columns already exist, skip this migration
        // These columns were already created in 2025_01_01_000000_create_finance_documents_table
        if (Schema::hasColumn('finance_documents', 'donor_id') &&
            Schema::hasColumn('finance_documents', 'project_id') &&
            Schema::hasColumn('finance_documents', 'income_entry_id') &&
            Schema::hasColumn('finance_documents', 'expense_entry_id') &&
            Schema::hasColumn('finance_documents', 'account_id')) {
            return; // All columns already exist, skip
        }

        // Add columns that don't exist
        Schema::table('finance_documents', function (Blueprint $table) {
            if (!Schema::hasColumn('finance_documents', 'donor_id')) {
            $table->uuid('donor_id')->nullable()->after('staff_id');
            }
            if (!Schema::hasColumn('finance_documents', 'project_id')) {
            $table->uuid('project_id')->nullable()->after('donor_id');
            }
            if (!Schema::hasColumn('finance_documents', 'income_entry_id')) {
            $table->uuid('income_entry_id')->nullable()->after('project_id');
            }
            if (!Schema::hasColumn('finance_documents', 'expense_entry_id')) {
            $table->uuid('expense_entry_id')->nullable()->after('income_entry_id');
            }
            if (!Schema::hasColumn('finance_documents', 'account_id')) {
            $table->uuid('account_id')->nullable()->after('expense_entry_id');
            }
        });

        // Add foreign keys (with try-catch to handle cases where they already exist)
        Schema::table('finance_documents', function (Blueprint $table) {
            try {
                if (Schema::hasColumn('finance_documents', 'donor_id') && 
                    !$this->foreignKeyExists('finance_documents', 'donor_id')) {
            $table->foreign('donor_id')->references('id')->on('donors')->onDelete('set null');
                }
            } catch (\Exception $e) {
                // Foreign key might already exist, skip
            }
            
            try {
                if (Schema::hasColumn('finance_documents', 'project_id') && 
                    !$this->foreignKeyExists('finance_documents', 'project_id')) {
            $table->foreign('project_id')->references('id')->on('finance_projects')->onDelete('set null');
                }
            } catch (\Exception $e) {
                // Foreign key might already exist, skip
            }
            
            try {
                if (Schema::hasColumn('finance_documents', 'income_entry_id') && 
                    !$this->foreignKeyExists('finance_documents', 'income_entry_id')) {
            $table->foreign('income_entry_id')->references('id')->on('income_entries')->onDelete('set null');
                }
            } catch (\Exception $e) {
                // Foreign key might already exist, skip
            }
            
            try {
                if (Schema::hasColumn('finance_documents', 'expense_entry_id') && 
                    !$this->foreignKeyExists('finance_documents', 'expense_entry_id')) {
            $table->foreign('expense_entry_id')->references('id')->on('expense_entries')->onDelete('set null');
                }
            } catch (\Exception $e) {
                // Foreign key might already exist, skip
            }
            
            try {
                if (Schema::hasColumn('finance_documents', 'account_id') && 
                    !$this->foreignKeyExists('finance_documents', 'account_id')) {
            $table->foreign('account_id')->references('id')->on('finance_accounts')->onDelete('set null');
                }
            } catch (\Exception $e) {
                // Foreign key might already exist, skip
            }
        });

        // Add indexes (with try-catch to handle cases where they already exist)
        Schema::table('finance_documents', function (Blueprint $table) {
            try {
                if (Schema::hasColumn('finance_documents', 'donor_id') && 
                    !$this->indexExists('finance_documents', 'donor_id')) {
            $table->index('donor_id');
                }
            } catch (\Exception $e) {
                // Index might already exist, skip
            }
            
            try {
                if (Schema::hasColumn('finance_documents', 'project_id') && 
                    !$this->indexExists('finance_documents', 'project_id')) {
            $table->index('project_id');
                }
            } catch (\Exception $e) {
                // Index might already exist, skip
            }
            
            try {
                if (Schema::hasColumn('finance_documents', 'income_entry_id') && 
                    !$this->indexExists('finance_documents', 'income_entry_id')) {
            $table->index('income_entry_id');
                }
            } catch (\Exception $e) {
                // Index might already exist, skip
            }
            
            try {
                if (Schema::hasColumn('finance_documents', 'expense_entry_id') && 
                    !$this->indexExists('finance_documents', 'expense_entry_id')) {
            $table->index('expense_entry_id');
                }
            } catch (\Exception $e) {
                // Index might already exist, skip
            }
            
            try {
                if (Schema::hasColumn('finance_documents', 'account_id') && 
                    !$this->indexExists('finance_documents', 'account_id')) {
            $table->index('account_id');
                }
            } catch (\Exception $e) {
                // Index might already exist, skip
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('finance_documents')) {
            return;
        }

        Schema::table('finance_documents', function (Blueprint $table) {
            // Drop foreign keys if they exist
            $columns = ['donor_id', 'project_id', 'income_entry_id', 'expense_entry_id', 'account_id'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('finance_documents', $column)) {
                    try {
                        $table->dropForeign([$column]);
                    } catch (\Exception $e) {
                        // Foreign key doesn't exist, skip
                    }
                    try {
                        $table->dropIndex([$column]);
                    } catch (\Exception $e) {
                        // Index doesn't exist, skip
                    }
                }
            }

            // Drop columns if they exist
            $columnsToDrop = [];
            foreach ($columns as $column) {
                if (Schema::hasColumn('finance_documents', $column)) {
                    $columnsToDrop[] = $column;
                }
            }
            if (!empty($columnsToDrop)) {
                try {
                    $table->dropColumn($columnsToDrop);
                } catch (\Exception $e) {
                    // Columns might not exist, skip
                }
            }
        });
    }

    /**
     * Check if a foreign key exists for a column
     */
    private function foreignKeyExists(string $table, string $column): bool
    {
        $connection = Schema::getConnection();
        $result = $connection->selectOne("
            SELECT COUNT(*) as count
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = ? 
            AND kcu.column_name = ?
            AND tc.constraint_type = 'FOREIGN KEY'
        ", [$table, $column]);
        
        return $result && $result->count > 0;
    }

    /**
     * Check if an index exists for a column
     */
    private function indexExists(string $table, string $column): bool
    {
        $connection = Schema::getConnection();
        $result = $connection->selectOne("
            SELECT COUNT(*) as count
            FROM pg_indexes
            WHERE tablename = ?
            AND indexdef LIKE ?
        ", [$table, "%{$column}%"]);
        
        return $result && $result->count > 0;
    }
};
