<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Update the unique constraint on assets to include school_id.
     * This allows each school to have assets with the same asset_tag.
     */
    public function up(): void
    {
        if (!Schema::hasTable('assets')) {
            return;
        }

        // Drop the old unique constraint
        DB::statement('ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_asset_tag_org_unique');

        // Add the new unique constraint including school_id
        Schema::table('assets', function (Blueprint $table) {
            $table->unique(['asset_tag', 'organization_id', 'school_id'], 'assets_asset_tag_org_school_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('assets')) {
            return;
        }

        // Drop the new unique constraint
        DB::statement('ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_asset_tag_org_school_unique');

        // Re-add the old unique constraint
        Schema::table('assets', function (Blueprint $table) {
            $table->unique(['asset_tag', 'organization_id'], 'assets_asset_tag_org_unique');
        });
    }
};
