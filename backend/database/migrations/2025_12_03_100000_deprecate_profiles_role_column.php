<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * This migration documents that the profiles.role column is deprecated.
     * Roles are now managed via Spatie's model_has_roles table.
     * The column is kept for backward compatibility and display purposes only.
     */
    public function up(): void
    {
        // Add comment to document deprecation
        DB::statement("
            COMMENT ON COLUMN public.profiles.role IS 'DEPRECATED: This column is kept for backward compatibility only. Roles are now managed via Spatie Laravel Permission package using the model_has_roles table. Use User model methods (hasRole, assignRole, etc.) to manage roles.';
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove comment (no action needed, column remains)
        DB::statement("
            COMMENT ON COLUMN public.profiles.role IS NULL;
        ");
    }
};

