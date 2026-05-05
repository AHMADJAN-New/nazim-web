<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_records', function (Blueprint $table) {
            $table->uuid('sales_invoice_id')->nullable()->after('maintenance_invoice_id');
            $table->index('sales_invoice_id');

            $table->foreign('sales_invoice_id')
                ->references('id')
                ->on('sales_invoices')
                ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('payment_records', function (Blueprint $table) {
            $table->dropForeign(['sales_invoice_id']);
            $table->dropIndex(['sales_invoice_id']);
            $table->dropColumn('sales_invoice_id');
        });
    }
};

