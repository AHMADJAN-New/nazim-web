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
        // Create staff_types table
        Schema::create('staff_types', function (Blueprint $table) {
            // UUID primary key
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            
            // Multi-tenancy: organization_id is nullable (NULL = global types)
            $table->uuid('organization_id')->nullable();
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            
            // Staff type information
            $table->string('name', 100);
            $table->string('code', 50);
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

        // Create unique index for code per organization (handles NULL organization_id)
        DB::statement("
            CREATE UNIQUE INDEX idx_staff_types_unique_code_per_org 
            ON public.staff_types (code, COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid))
            WHERE deleted_at IS NULL;
        ");

        // Create trigger for updated_at
        DB::statement("
            CREATE TRIGGER update_staff_types_updated_at
                BEFORE UPDATE ON public.staff_types
                FOR EACH ROW
                EXECUTE FUNCTION public.update_updated_at_column();
        ");

        // Add comment
        DB::statement("
            COMMENT ON TABLE public.staff_types IS 'Lookup table for staff roles/types. NULL organization_id = global types available to all organizations.';
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS update_staff_types_updated_at ON public.staff_types;');
        Schema::dropIfExists('staff_types');
    }
};
