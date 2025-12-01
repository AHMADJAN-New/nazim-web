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
        // Create update_updated_at_column function if it doesn't exist
        DB::statement("
            CREATE OR REPLACE FUNCTION public.update_updated_at_column()
            RETURNS TRIGGER
            LANGUAGE plpgsql
            SET search_path = public
            AS $$
            BEGIN
                NEW.updated_at := NOW();
                RETURN NEW;
            END;
            $$;
        ");

        // Create profiles table
        Schema::create('profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id')->nullable();
            $table->uuid('default_school_id')->nullable();
            $table->string('role', 50)->default('student');
            $table->string('full_name', 255)->nullable();
            $table->string('email', 255)->nullable();
            $table->string('phone', 50)->nullable();
            $table->text('avatar_url')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->timestamp('deleted_at')->nullable();

            // Foreign keys
            $table->foreign('id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('set null');

            // Indexes
            $table->index('organization_id');
            $table->index('role');
            $table->index('email');
            $table->index('default_school_id');
            $table->index('deleted_at');
        });

        // Create trigger for updated_at
        DB::statement("
            CREATE TRIGGER update_profiles_updated_at
                BEFORE UPDATE ON public.profiles
                FOR EACH ROW
                EXECUTE FUNCTION public.update_updated_at_column();
        ");

        // Add comment
        DB::statement("
            COMMENT ON TABLE public.profiles IS 'Extended auth user profiles with multi-tenant context.';
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;');
        Schema::dropIfExists('profiles');
    }
};
