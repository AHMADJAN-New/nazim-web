<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Make permission groups global (organization_id = NULL)
     */
    public function up(): void
    {
        // Drop the old unique constraint that includes organization_id
        DB::statement('ALTER TABLE permission_groups DROP CONSTRAINT IF EXISTS permission_groups_name_organization_id_unique');
        
        // Set all existing groups to NULL (make them global)
        DB::table('permission_groups')->update(['organization_id' => null]);
        
        // Create new unique constraint on name only (groups are global)
        DB::statement('ALTER TABLE permission_groups ADD CONSTRAINT permission_groups_name_unique UNIQUE (name)');
        
        // Make organization_id nullable (it already is, but ensure it)
        Schema::table('permission_groups', function (Blueprint $table) {
            $table->uuid('organization_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop the global unique constraint
        DB::statement('ALTER TABLE permission_groups DROP CONSTRAINT IF EXISTS permission_groups_name_unique');
        
        // Restore the organization-scoped unique constraint
        DB::statement('ALTER TABLE permission_groups ADD CONSTRAINT permission_groups_name_organization_id_unique UNIQUE (name, organization_id)');
    }
};
