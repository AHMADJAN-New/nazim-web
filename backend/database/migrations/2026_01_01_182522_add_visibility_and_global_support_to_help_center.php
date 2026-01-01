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
        // Update help_center_categories: make organization_id nullable
        Schema::table('help_center_categories', function (Blueprint $table) {
            $table->uuid('organization_id')->nullable()->change();
        });

        // Update help_center_articles: make organization_id nullable and add visibility
        Schema::table('help_center_articles', function (Blueprint $table) {
            $table->uuid('organization_id')->nullable()->change();
            $table->string('visibility', 20)->default('org_users')->after('status');
        });

        // Drop old unique constraint on articles (slug + organization_id)
        DB::statement("
            ALTER TABLE public.help_center_articles
            DROP CONSTRAINT IF EXISTS help_articles_slug_org_unique
        ");

        // Create new unique constraint: slug must be unique per (organization_id, category_id)
        // For global articles (organization_id IS NULL), slug must be unique globally
        DB::statement("
            CREATE UNIQUE INDEX help_articles_slug_org_category_unique 
            ON public.help_center_articles (slug, COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), category_id)
            WHERE deleted_at IS NULL
        ");

        // Drop old unique constraint on categories
        DB::statement("
            ALTER TABLE public.help_center_categories
            DROP CONSTRAINT IF EXISTS help_categories_slug_org_unique
        ");

        // Create new unique constraint for categories: slug unique per (organization_id, parent_id)
        DB::statement("
            CREATE UNIQUE INDEX help_categories_slug_org_parent_unique 
            ON public.help_center_categories (slug, COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid))
            WHERE deleted_at IS NULL
        ");

        // Add check constraint for visibility
        DB::statement("
            ALTER TABLE public.help_center_articles
            ADD CONSTRAINT help_articles_visibility_valid 
            CHECK (visibility IN ('public', 'org_users', 'staff_only'))
        ");

        // Add index for visibility
        Schema::table('help_center_articles', function (Blueprint $table) {
            $table->index('visibility');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove visibility column
        Schema::table('help_center_articles', function (Blueprint $table) {
            $table->dropIndex(['visibility']);
            $table->dropColumn('visibility');
        });

        // Drop new unique constraints
        DB::statement("
            DROP INDEX IF EXISTS help_articles_slug_org_category_unique
        ");
        DB::statement("
            DROP INDEX IF EXISTS help_categories_slug_org_parent_unique
        ");

        // Restore old unique constraints
        Schema::table('help_center_articles', function (Blueprint $table) {
            $table->unique(['slug', 'organization_id'], 'help_articles_slug_org_unique');
        });

        Schema::table('help_center_categories', function (Blueprint $table) {
            $table->unique(['slug', 'organization_id'], 'help_categories_slug_org_unique');
        });

        // Make organization_id NOT NULL again (this will fail if there are NULL values)
        // Note: In production, you'd need to handle existing NULL values first
        Schema::table('help_center_categories', function (Blueprint $table) {
            $table->uuid('organization_id')->nullable(false)->change();
        });

        Schema::table('help_center_articles', function (Blueprint $table) {
            $table->uuid('organization_id')->nullable(false)->change();
        });

        DB::statement("
            ALTER TABLE public.help_center_articles
            DROP CONSTRAINT IF EXISTS help_articles_visibility_valid
        ");
    }
};
