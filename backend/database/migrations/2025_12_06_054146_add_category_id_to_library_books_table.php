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
            $table->uuid('category_id')->nullable()->after('category');
            $table->foreign('category_id')->references('id')->on('library_categories')->onDelete('set null');
            
            // Add index
            $table->index('category_id');
        });
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
