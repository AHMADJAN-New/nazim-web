<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('student_id_cards', function (Blueprint $table) {
            $table->uuid('income_entry_id')->nullable()->after('card_fee_paid_date');
            $table->foreign('income_entry_id')->references('id')->on('income_entries')->onDelete('set null');
            $table->index('income_entry_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('student_id_cards', function (Blueprint $table) {
            $table->dropForeign(['income_entry_id']);
            $table->dropIndex(['income_entry_id']);
            $table->dropColumn('income_entry_id');
        });
    }
};
