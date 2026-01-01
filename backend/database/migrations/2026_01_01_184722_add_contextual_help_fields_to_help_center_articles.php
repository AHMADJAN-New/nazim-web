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
        Schema::table('help_center_articles', function (Blueprint $table) {
            $table->string('context_key', 100)->nullable()->after('visibility');
            $table->string('route_pattern', 255)->nullable()->after('context_key');
        });

        // Add indexes for contextual help lookup
        DB::statement("
            CREATE INDEX idx_help_articles_context_key 
            ON public.help_center_articles (context_key) 
            WHERE context_key IS NOT NULL AND status = 'published' AND deleted_at IS NULL
        ");

        DB::statement("
            CREATE INDEX idx_help_articles_route_pattern 
            ON public.help_center_articles (route_pattern) 
            WHERE route_pattern IS NOT NULL AND status = 'published' AND deleted_at IS NULL
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("DROP INDEX IF EXISTS idx_help_articles_context_key");
        DB::statement("DROP INDEX IF EXISTS idx_help_articles_route_pattern");

        Schema::table('help_center_articles', function (Blueprint $table) {
            $table->dropColumn(['context_key', 'route_pattern']);
        });
    }
};
