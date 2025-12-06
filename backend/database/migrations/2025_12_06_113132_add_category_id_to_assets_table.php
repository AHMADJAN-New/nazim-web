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
        // Add category_id column
        Schema::table('assets', function (Blueprint $table) {
            $table->uuid('category_id')->nullable()->after('asset_tag');
            $table->foreign('category_id')->references('id')->on('asset_categories')->onDelete('set null');
            $table->index('category_id');
        });

        // Migrate existing category strings to asset_categories
        // This will create categories from existing category values
        DB::statement("
            INSERT INTO public.asset_categories (id, organization_id, name, code, description, is_active, display_order, created_at, updated_at)
            SELECT DISTINCT
                gen_random_uuid() as id,
                a.organization_id,
                a.category as name,
                NULL as code,
                NULL as description,
                true as is_active,
                0 as display_order,
                NOW() as created_at,
                NOW() as updated_at
            FROM public.assets a
            WHERE a.category IS NOT NULL
                AND a.category != ''
                AND a.deleted_at IS NULL
                AND NOT EXISTS (
                    SELECT 1 FROM public.asset_categories ac
                    WHERE ac.name = a.category
                        AND ac.organization_id = a.organization_id
                        AND ac.deleted_at IS NULL
                )
            ON CONFLICT DO NOTHING;
        ");

        // Update assets to link to categories
        DB::statement("
            UPDATE public.assets a
            SET category_id = ac.id
            FROM public.asset_categories ac
            WHERE a.category = ac.name
                AND a.organization_id = ac.organization_id
                AND a.category IS NOT NULL
                AND a.category != ''
                AND a.deleted_at IS NULL
                AND ac.deleted_at IS NULL;
        ");

        // Note: We keep the category column for now to allow rollback
        // It can be removed in a future migration if needed
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            $table->dropForeign(['category_id']);
            $table->dropIndex(['category_id']);
            $table->dropColumn('category_id');
        });
    }
};
