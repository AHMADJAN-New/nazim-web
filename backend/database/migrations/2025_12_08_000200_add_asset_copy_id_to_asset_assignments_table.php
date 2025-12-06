<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('asset_assignments', function (Blueprint $table) {
            $table->uuid('asset_copy_id')->nullable()->after('asset_id');
            $table->foreign('asset_copy_id')->references('id')->on('asset_copies')->onDelete('cascade');
            $table->index('asset_copy_id');
        });
    }

    public function down(): void
    {
        Schema::table('asset_assignments', function (Blueprint $table) {
            $table->dropForeign(['asset_copy_id']);
            $table->dropIndex(['asset_copy_id']);
            $table->dropColumn('asset_copy_id');
        });
    }
};

