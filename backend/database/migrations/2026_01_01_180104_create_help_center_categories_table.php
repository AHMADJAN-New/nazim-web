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
        Schema::create('help_center_categories', function (Blueprint $table) {
            // UUID primary key
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            
            // Multi-tenancy: organization_id is required
            $table->uuid('organization_id');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            
            // Category information
            $table->string('name', 255);
            $table->string('slug', 255);
            $table->text('description')->nullable();
            $table->string('icon', 100)->nullable(); // Icon name (e.g., 'book', 'users', 'settings')
            $table->string('color', 50)->nullable(); // Color for UI (e.g., 'blue', 'green')
            
            // Ordering
            $table->integer('order')->default(0);
            
            // Status
            $table->boolean('is_active')->default(true);
            
            // Parent category for nested categories
            $table->uuid('parent_id')->nullable();
            // Note: Self-referencing foreign key must be created after table creation
            
            // Metadata
            $table->integer('article_count')->default(0); // Cached count of articles
            
            // Timestamps
            $table->timestamps();
            $table->timestamp('deleted_at')->nullable();
            
            // Indexes
            $table->index('organization_id');
            $table->index('slug');
            $table->index('parent_id');
            $table->index('is_active');
            $table->index('order');
            $table->index('deleted_at');
            
            // Unique constraint: slug must be unique per organization
            $table->unique(['slug', 'organization_id'], 'help_categories_slug_org_unique');
        });

        // Create self-referencing foreign key AFTER table creation (required for PostgreSQL)
        DB::statement("
            ALTER TABLE public.help_center_categories
            ADD CONSTRAINT help_center_categories_parent_id_foreign
            FOREIGN KEY (parent_id)
            REFERENCES public.help_center_categories(id)
            ON DELETE CASCADE
        ");

        // Create trigger for updated_at
        DB::statement("
            CREATE TRIGGER update_help_center_categories_updated_at
                BEFORE UPDATE ON public.help_center_categories
                FOR EACH ROW
                EXECUTE FUNCTION public.update_updated_at_column();
        ");

        // Add comment
        DB::statement("
            COMMENT ON TABLE public.help_center_categories IS 'Help center categories with organization isolation.';
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS update_help_center_categories_updated_at ON public.help_center_categories;');
        DB::statement('ALTER TABLE public.help_center_categories DROP CONSTRAINT IF EXISTS help_center_categories_parent_id_foreign;');
        Schema::dropIfExists('help_center_categories');
    }
};
