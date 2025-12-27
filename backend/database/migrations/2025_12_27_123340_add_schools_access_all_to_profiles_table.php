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
        Schema::table('profiles', function (Blueprint $table) {
            $table->boolean('schools_access_all')->default(false)->after('default_school_id');
        });

        // Add index for performance
        DB::statement('CREATE INDEX IF NOT EXISTS idx_profiles_schools_access_all ON public.profiles(schools_access_all) WHERE schools_access_all = true');

        // Add comment
        DB::statement("
            COMMENT ON COLUMN public.profiles.schools_access_all IS 'If true, user can access all schools in their organization and switch between them';
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->dropColumn('schools_access_all');
        });

        DB::statement('DROP INDEX IF EXISTS idx_profiles_schools_access_all');
    }
};
