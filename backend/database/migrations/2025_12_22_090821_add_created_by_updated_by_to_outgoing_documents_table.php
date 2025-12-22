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
        Schema::table('outgoing_documents', function (Blueprint $table) {
            if (!Schema::hasColumn('outgoing_documents', 'created_by')) {
                $table->uuid('created_by')->nullable()->after('status');
            }
            if (!Schema::hasColumn('outgoing_documents', 'updated_by')) {
                $table->uuid('updated_by')->nullable()->after('created_by');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('outgoing_documents', function (Blueprint $table) {
            if (Schema::hasColumn('outgoing_documents', 'updated_by')) {
                $table->dropColumn('updated_by');
            }
            if (Schema::hasColumn('outgoing_documents', 'created_by')) {
                $table->dropColumn('created_by');
            }
        });
    }
};
