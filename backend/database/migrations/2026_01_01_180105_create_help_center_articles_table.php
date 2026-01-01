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
        Schema::create('help_center_articles', function (Blueprint $table) {
            // UUID primary key
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            
            // Multi-tenancy: organization_id is required
            $table->uuid('organization_id');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            
            // Category reference
            $table->uuid('category_id');
            $table->foreign('category_id')->references('id')->on('help_center_categories')->onDelete('cascade');
            
            // Article information
            $table->string('title', 255);
            $table->string('slug', 255);
            $table->text('excerpt')->nullable(); // Short description for listings
            $table->text('content'); // Full article content (supports markdown/HTML)
            $table->string('content_type', 50)->default('markdown'); // 'markdown' or 'html'
            
            // Featured image
            $table->text('featured_image_url')->nullable();
            
            // Status and visibility
            $table->boolean('is_published')->default(false);
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_pinned')->default(false);
            
            // SEO and metadata
            $table->string('meta_title', 255)->nullable();
            $table->text('meta_description')->nullable();
            $table->json('tags')->default('[]'); // Array of tags
            
            // Analytics
            $table->integer('view_count')->default(0);
            $table->integer('helpful_count')->default(0);
            $table->integer('not_helpful_count')->default(0);
            
            // Ordering
            $table->integer('order')->default(0);
            
            // Author information
            $table->uuid('author_id')->nullable();
            $table->foreign('author_id')->references('id')->on('profiles')->onDelete('set null');
            
            // Related articles (stored as JSON array of article IDs)
            $table->json('related_article_ids')->default('[]');
            
            // Timestamps
            $table->timestamps();
            $table->timestamp('published_at')->nullable();
            $table->timestamp('deleted_at')->nullable();
            
            // Indexes
            $table->index('organization_id');
            $table->index('category_id');
            $table->index('slug');
            $table->index('is_published');
            $table->index('is_featured');
            $table->index('is_pinned');
            $table->index('published_at');
            $table->index('view_count');
            $table->index('order');
            $table->index('deleted_at');
            
            // Unique constraint: slug must be unique per organization
            $table->unique(['slug', 'organization_id'], 'help_articles_slug_org_unique');
        });

        // Full-text search index (PostgreSQL) - must be created AFTER table creation
        DB::statement("
            CREATE INDEX idx_help_articles_search ON public.help_center_articles 
            USING GIN (to_tsvector('english', title || ' ' || COALESCE(excerpt, '') || ' ' || content));
        ");

        // Create trigger for updated_at
        DB::statement("
            CREATE TRIGGER update_help_center_articles_updated_at
                BEFORE UPDATE ON public.help_center_articles
                FOR EACH ROW
                EXECUTE FUNCTION public.update_updated_at_column();
        ");

        // Add comment
        DB::statement("
            COMMENT ON TABLE public.help_center_articles IS 'Help center articles with organization isolation, rich content support, and analytics.';
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_help_articles_search;');
        DB::statement('DROP TRIGGER IF EXISTS update_help_center_articles_updated_at ON public.help_center_articles;');
        Schema::dropIfExists('help_center_articles');
    }
};
