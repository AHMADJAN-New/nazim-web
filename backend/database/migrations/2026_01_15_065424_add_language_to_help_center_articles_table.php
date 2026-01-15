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
            // Add language column (en, ps, fa, ar)
            $table->string('language', 10)->default('en')->after('content_type');
            
            // Add index on language for faster queries
            $table->index('language');
        });

        // Drop old unique indexes/constraints
        DB::statement('DROP INDEX IF EXISTS help_articles_slug_global_unique;');
        DB::statement('DROP INDEX IF EXISTS help_articles_slug_org_unique;');
        DB::statement('ALTER TABLE help_center_articles DROP CONSTRAINT IF EXISTS help_articles_slug_org_unique;');
        DB::statement('ALTER TABLE help_center_articles DROP CONSTRAINT IF EXISTS help_articles_slug_org_lang_unique;');

        // Create new partial unique indexes that include language
        // For global articles (organization_id IS NULL): unique per (category_id, slug, language)
        DB::statement("
            CREATE UNIQUE INDEX help_articles_slug_global_unique
            ON public.help_center_articles (category_id, slug, language)
            WHERE organization_id IS NULL AND deleted_at IS NULL
        ");

        // For org articles (organization_id IS NOT NULL): unique per (organization_id, category_id, slug, language)
        DB::statement("
            CREATE UNIQUE INDEX help_articles_slug_org_unique
            ON public.help_center_articles (organization_id, category_id, slug, language)
            WHERE organization_id IS NOT NULL AND deleted_at IS NULL
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop new unique indexes
        DB::statement('DROP INDEX IF EXISTS help_articles_slug_global_unique;');
        DB::statement('DROP INDEX IF EXISTS help_articles_slug_org_unique;');

        Schema::table('help_center_articles', function (Blueprint $table) {
            // Drop language index
            $table->dropIndex(['language']);
            
            // Drop language column
            $table->dropColumn('language');
        });

        // Restore old unique indexes (without language)
        // For global articles (organization_id IS NULL): unique per (category_id, slug)
        DB::statement("
            CREATE UNIQUE INDEX help_articles_slug_global_unique
            ON public.help_center_articles (category_id, slug)
            WHERE organization_id IS NULL AND deleted_at IS NULL
        ");

        // For org articles (organization_id IS NOT NULL): unique per (organization_id, category_id, slug)
        DB::statement("
            CREATE UNIQUE INDEX help_articles_slug_org_unique
            ON public.help_center_articles (organization_id, category_id, slug)
            WHERE organization_id IS NOT NULL AND deleted_at IS NULL
        ");
    }
};
