<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('library_books', function (Blueprint $table) {
            $table->dropUnique(['book_number']);
            $table->dropIndex(['book_number']);
        });

        // Active books in each school become 1..n by creation time.
        // Soft-deleted books continue after that so a restore cannot collide.
        DB::statement(<<<'SQL'
            WITH numbered AS (
                SELECT id,
                       ROW_NUMBER() OVER (
                           PARTITION BY organization_id, school_id
                           ORDER BY CASE WHEN deleted_at IS NULL THEN 0 ELSE 1 END,
                                    created_at NULLS LAST,
                                    id
                       ) AS seq
                FROM library_books
            )
            UPDATE library_books AS books
            SET book_number = numbered.seq::text
            FROM numbered
            WHERE books.id = numbered.id
        SQL);

        DB::statement(<<<'SQL'
            CREATE UNIQUE INDEX library_books_org_school_book_number_unique
            ON library_books (organization_id, school_id, book_number)
            WHERE deleted_at IS NULL AND book_number IS NOT NULL
        SQL);
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS library_books_org_school_book_number_unique');

        Schema::table('library_books', function (Blueprint $table) {
            $table->unique('book_number');
            $table->index('book_number');
        });
    }
};
