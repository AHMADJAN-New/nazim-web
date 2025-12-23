<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('library_books')) {
            return;
        }

        Schema::table('library_books', function (Blueprint $table) {
            // Add category_id column (nullable for backward compatibility)
            // Check if column doesn't exist before adding (for future deployments)
            if (!Schema::hasColumn('library_books', 'category_id')) {
                $table->uuid('category_id')->nullable()->after('category');
            }
        });

        // Add foreign key constraint separately (check if it doesn't exist)
        if (Schema::hasTable('library_books') && Schema::hasColumn('library_books', 'category_id')) {
            try {
                DB::statement('ALTER TABLE library_books ADD CONSTRAINT library_books_category_id_foreign FOREIGN KEY (category_id) REFERENCES library_categories(id) ON DELETE SET NULL');
            } catch (\Exception $e) {
                // Foreign key might already exist, ignore
                if (strpos($e->getMessage(), 'already exists') === false && strpos($e->getMessage(), 'duplicate') === false) {
                    throw $e;
                }
            }

            // Add index if it doesn't exist
            try {
                DB::statement('CREATE INDEX IF NOT EXISTS idx_library_books_category_id ON library_books(category_id)');
            } catch (\Exception $e) {
                // Index might already exist, ignore
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('library_books', function (Blueprint $table) {
            $table->dropForeign(['category_id']);
            $table->dropIndex(['category_id']);
            $table->dropColumn('category_id');
        });
    }
};
