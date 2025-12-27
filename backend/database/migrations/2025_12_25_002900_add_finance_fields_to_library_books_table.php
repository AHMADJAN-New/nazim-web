<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Add currency_id and finance_account_id to library_books table for finance integration
     */
    public function up(): void
    {
        Schema::table('library_books', function (Blueprint $table) {
            $table->uuid('currency_id')->nullable()->after('organization_id');
            $table->uuid('finance_account_id')->nullable()->after('currency_id');
            
            $table->foreign('currency_id')->references('id')->on('currencies')->onDelete('restrict');
            $table->foreign('finance_account_id')->references('id')->on('finance_accounts')->onDelete('set null');
            
            $table->index('currency_id');
            $table->index('finance_account_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('library_books', function (Blueprint $table) {
            $table->dropForeign(['finance_account_id']);
            $table->dropIndex(['finance_account_id']);
            $table->dropColumn('finance_account_id');
            
            $table->dropForeign(['currency_id']);
            $table->dropIndex(['currency_id']);
            $table->dropColumn('currency_id');
        });
    }
};

