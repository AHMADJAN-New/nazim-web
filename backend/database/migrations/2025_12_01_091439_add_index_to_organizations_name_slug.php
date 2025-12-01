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
        // Add indexes for faster lookups
        DB::statement('CREATE INDEX IF NOT EXISTS idx_organizations_name ON public.organizations(name) WHERE deleted_at IS NULL;');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug) WHERE deleted_at IS NULL;');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_organizations_name;');
        DB::statement('DROP INDEX IF EXISTS idx_organizations_slug;');
    }
};
