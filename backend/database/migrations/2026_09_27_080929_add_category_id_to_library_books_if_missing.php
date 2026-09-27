<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The earlier category_id migration ran before library_books existed, so the column was never created.
     * Books still store the category name in the legacy category string column.
     */
    public function up(): void
    {
        if (! Schema::hasTable('library_books') || ! Schema::hasTable('library_categories')) {
            return;
        }

        if (! Schema::hasColumn('library_books', 'category_id')) {
            Schema::table('library_books', function (Blueprint $table) {
                $table->uuid('category_id')->nullable();
            });
        }

        DB::statement('CREATE INDEX IF NOT EXISTS idx_library_books_category_id ON library_books (category_id)');

        $constraintExists = DB::selectOne(
            'SELECT 1 AS found FROM pg_constraint WHERE conname = ?',
            ['library_books_category_id_foreign']
        );

        if ($constraintExists === null) {
            DB::statement(
                'ALTER TABLE library_books ADD CONSTRAINT library_books_category_id_foreign FOREIGN KEY (category_id) REFERENCES library_categories (id) ON DELETE SET NULL'
            );
        }

        DB::statement("
            UPDATE library_books AS b
            SET category_id = c.id
            FROM library_categories AS c
            WHERE b.category_id IS NULL
              AND b.category IS NOT NULL
              AND btrim(b.category) <> ''
              AND c.deleted_at IS NULL
              AND c.organization_id = b.organization_id
              AND c.school_id IS NOT DISTINCT FROM b.school_id
              AND c.name = b.category
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('library_books') || ! Schema::hasColumn('library_books', 'category_id')) {
            return;
        }

        Schema::table('library_books', function (Blueprint $table) {
            $table->dropForeign('library_books_category_id_foreign');
            $table->dropIndex('idx_library_books_category_id');
            $table->dropColumn('category_id');
        });
    }
};
