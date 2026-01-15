<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Add composite indexes for common query patterns to improve performance
     */
    public function up(): void
    {
        // Composite index for language + organization_id + deleted_at (most common filter)
        // This speeds up queries that filter by language and organization
        DB::statement("
            CREATE INDEX IF NOT EXISTS idx_help_articles_lang_org_deleted
            ON public.help_center_articles (language, organization_id, deleted_at)
            WHERE deleted_at IS NULL
        ");

        // Composite index for language + category_id + status (for category pages)
        DB::statement("
            CREATE INDEX IF NOT EXISTS idx_help_articles_lang_category_status
            ON public.help_center_articles (language, category_id, status, deleted_at)
            WHERE deleted_at IS NULL
        ");

        // Composite index for language + is_featured + is_pinned (for featured/popular queries)
        DB::statement("
            CREATE INDEX IF NOT EXISTS idx_help_articles_lang_featured_pinned
            ON public.help_center_articles (language, is_featured, is_pinned, published_at, deleted_at)
            WHERE deleted_at IS NULL AND status = 'published'
        ");

        // Composite index for language + view_count (for popular articles)
        DB::statement("
            CREATE INDEX IF NOT EXISTS idx_help_articles_lang_views
            ON public.help_center_articles (language, view_count DESC, deleted_at)
            WHERE deleted_at IS NULL AND status = 'published'
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_help_articles_lang_org_deleted;');
        DB::statement('DROP INDEX IF EXISTS idx_help_articles_lang_category_status;');
        DB::statement('DROP INDEX IF EXISTS idx_help_articles_lang_featured_pinned;');
        DB::statement('DROP INDEX IF EXISTS idx_help_articles_lang_views;');
    }
};
