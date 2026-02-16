<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('desktop_releases', function (Blueprint $table) {
            $table->boolean('download_available')->default(false)->after('is_latest');
        });

        // Preserve existing behavior: published releases are downloadable
        DB::table('desktop_releases')
            ->whereNull('deleted_at')
            ->where('status', 'published')
            ->update(['download_available' => true]);
    }

    public function down(): void
    {
        Schema::table('desktop_releases', function (Blueprint $table) {
            $table->dropColumn('download_available');
        });
    }
};
