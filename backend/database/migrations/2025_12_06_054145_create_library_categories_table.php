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
        if (Schema::hasTable('library_categories')) {
            return;
        }

        // Create library_categories table
        Schema::create('library_categories', function (Blueprint $table) {
            // UUID primary key
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            
            // Multi-tenancy: organization_id is required (no global categories)
            $table->uuid('organization_id');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            
            // Category information
            $table->string('name', 100);
            $table->string('code', 50)->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('display_order')->default(0);
            
            // Timestamps
            $table->timestamps();
            $table->timestamp('deleted_at')->nullable();
            
            // Indexes
            $table->index('organization_id');
            $table->index('is_active');
            $table->index('deleted_at');
        });

        // Create unique index for code per organization (if code is provided)
        DB::statement("
            CREATE UNIQUE INDEX idx_library_categories_unique_code_per_org 
            ON public.library_categories (code, organization_id)
            WHERE deleted_at IS NULL AND code IS NOT NULL;
        ");

        // Create trigger for updated_at
        DB::statement("
            CREATE TRIGGER update_library_categories_updated_at
                BEFORE UPDATE ON public.library_categories
                FOR EACH ROW
                EXECUTE FUNCTION public.update_updated_at_column();
        ");

        // Add comment
        DB::statement("
            COMMENT ON TABLE public.library_categories IS 'Book categories for library management. All categories are organization-specific.';
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS update_library_categories_updated_at ON public.library_categories;');
        Schema::dropIfExists('library_categories');
    }
};
