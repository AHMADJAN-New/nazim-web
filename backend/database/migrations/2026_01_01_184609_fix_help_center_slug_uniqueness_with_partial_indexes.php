<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Step 1: Drop existing incorrect unique indexes
        DB::statement("DROP INDEX IF EXISTS help_articles_slug_org_category_unique");
        DB::statement("DROP INDEX IF EXISTS help_categories_slug_org_parent_unique");

        // Step 2: Detect and fix slug collisions for categories
        $this->fixCategorySlugCollisions();

        // Step 3: Detect and fix slug collisions for articles
        $this->fixArticleSlugCollisions();

        // Step 4: Create proper partial unique indexes for categories
        // For global categories (organization_id IS NULL): unique per (parent_id, slug)
        DB::statement("
            CREATE UNIQUE INDEX help_categories_slug_global_unique
            ON public.help_center_categories (COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), slug)
            WHERE organization_id IS NULL AND deleted_at IS NULL
        ");

        // For org categories (organization_id IS NOT NULL): unique per (organization_id, parent_id, slug)
        DB::statement("
            CREATE UNIQUE INDEX help_categories_slug_org_unique
            ON public.help_center_categories (organization_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), slug)
            WHERE organization_id IS NOT NULL AND deleted_at IS NULL
        ");

        // Step 5: Create proper partial unique indexes for articles
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

    /**
     * Fix slug collisions for categories
     */
    private function fixCategorySlugCollisions(): void
    {
        // Find categories with duplicate slugs within the same scope (global or org)
        $collisions = DB::select("
            SELECT 
                slug,
                COALESCE(organization_id::text, 'GLOBAL') as scope_key,
                COALESCE(parent_id::text, 'ROOT') as parent_key,
                array_agg(id::text) as ids
            FROM public.help_center_categories
            WHERE deleted_at IS NULL
            GROUP BY slug, organization_id, parent_id
            HAVING COUNT(*) > 1
        ");

        foreach ($collisions as $collision) {
            $ids = json_decode($collision->ids);
            // Keep first one, regenerate slugs for others
            $keepId = array_shift($ids);
            
            foreach ($ids as $id) {
                $category = DB::table('help_center_categories')->where('id', $id)->first();
                if ($category) {
                    $newSlug = $this->generateUniqueCategorySlug($category->name, $category->organization_id, $category->parent_id, $id);
                    DB::table('help_center_categories')
                        ->where('id', $id)
                        ->update(['slug' => $newSlug]);
                }
            }
        }
    }

    /**
     * Fix slug collisions for articles
     */
    private function fixArticleSlugCollisions(): void
    {
        // Find articles with duplicate slugs within the same scope (global or org)
        $collisions = DB::select("
            SELECT 
                slug,
                COALESCE(organization_id::text, 'GLOBAL') as scope_key,
                category_id::text as category_key,
                array_agg(id::text) as ids
            FROM public.help_center_articles
            WHERE deleted_at IS NULL
            GROUP BY slug, organization_id, category_id
            HAVING COUNT(*) > 1
        ");

        foreach ($collisions as $collision) {
            $ids = json_decode($collision->ids);
            // Keep first one, regenerate slugs for others
            $keepId = array_shift($ids);
            
            foreach ($ids as $id) {
                $article = DB::table('help_center_articles')->where('id', $id)->first();
                if ($article) {
                    $newSlug = $this->generateUniqueArticleSlug($article->title, $article->organization_id, $article->category_id, $id);
                    DB::table('help_center_articles')
                        ->where('id', $id)
                        ->update(['slug' => $newSlug]);
                }
            }
        }
    }

    /**
     * Generate unique slug for category
     */
    private function generateUniqueCategorySlug(string $name, ?string $organizationId, ?string $parentId, string $excludeId): string
    {
        $baseSlug = Str::slug($name);
        $slug = $baseSlug;
        $counter = 1;

        while (true) {
            $query = DB::table('help_center_categories')
                ->where('slug', $slug)
                ->where('deleted_at', null)
                ->where('id', '!=', $excludeId);

            if ($organizationId === null) {
                $query->whereNull('organization_id');
            } else {
                $query->where('organization_id', $organizationId);
            }

            if ($parentId === null) {
                $query->whereNull('parent_id');
            } else {
                $query->where('parent_id', $parentId);
            }

            if (!$query->exists()) {
                break;
            }

            $slug = $baseSlug . '-' . $counter;
            $counter++;
        }

        return $slug;
    }

    /**
     * Generate unique slug for article
     */
    private function generateUniqueArticleSlug(string $title, ?string $organizationId, string $categoryId, string $excludeId): string
    {
        $baseSlug = Str::slug($title);
        $slug = $baseSlug;
        $counter = 1;

        while (true) {
            $query = DB::table('help_center_articles')
                ->where('slug', $slug)
                ->where('category_id', $categoryId)
                ->where('deleted_at', null)
                ->where('id', '!=', $excludeId);

            if ($organizationId === null) {
                $query->whereNull('organization_id');
            } else {
                $query->where('organization_id', $organizationId);
            }

            if (!$query->exists()) {
                break;
            }

            $slug = $baseSlug . '-' . $counter;
            $counter++;
        }

        return $slug;
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop partial indexes
        DB::statement("DROP INDEX IF EXISTS help_categories_slug_global_unique");
        DB::statement("DROP INDEX IF EXISTS help_categories_slug_org_unique");
        DB::statement("DROP INDEX IF EXISTS help_articles_slug_global_unique");
        DB::statement("DROP INDEX IF EXISTS help_articles_slug_org_unique");

        // Restore old approach (for rollback compatibility)
        DB::statement("
            CREATE UNIQUE INDEX help_articles_slug_org_category_unique 
            ON public.help_center_articles (slug, COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), category_id)
            WHERE deleted_at IS NULL
        ");

        DB::statement("
            CREATE UNIQUE INDEX help_categories_slug_org_parent_unique 
            ON public.help_center_categories (slug, COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid))
            WHERE deleted_at IS NULL
        ");
    }
};
