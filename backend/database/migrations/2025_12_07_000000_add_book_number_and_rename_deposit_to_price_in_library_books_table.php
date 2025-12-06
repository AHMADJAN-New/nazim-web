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
            // Add book_number column (unique identifier for the book)
            $table->string('book_number')->nullable()->unique()->after('isbn');
            
            // Rename deposit_amount to price
            $table->renameColumn('deposit_amount', 'price');
            
            // Add index on book_number for faster lookups
            $table->index('book_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('library_books')) {
            return;
        }

        // Rename price back to deposit_amount (PostgreSQL requires separate statement)
        DB::statement('ALTER TABLE library_books RENAME COLUMN price TO deposit_amount');
        
        Schema::table('library_books', function (Blueprint $table) {
            // Remove unique constraint
            $table->dropUnique(['book_number']);
            
            // Remove index
            $table->dropIndex(['book_number']);
            
            // Drop book_number column
            $table->dropColumn('book_number');
        });
    }
};

