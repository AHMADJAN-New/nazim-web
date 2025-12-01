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

        // Insert default global staff types
        DB::statement("
            INSERT INTO public.staff_types (organization_id, name, code, description, display_order, is_active)
            SELECT * FROM (VALUES
                (NULL::uuid, 'Teacher'::varchar, 'teacher'::varchar, 'Teaching staff'::text, 1::integer, true::boolean),
                (NULL::uuid, 'Administrator'::varchar, 'admin'::varchar, 'Administrative staff'::text, 2::integer, true::boolean),
                (NULL::uuid, 'Accountant'::varchar, 'accountant'::varchar, 'Financial staff'::text, 3::integer, true::boolean),
                (NULL::uuid, 'Librarian'::varchar, 'librarian'::varchar, 'Library staff'::text, 4::integer, true::boolean),
                (NULL::uuid, 'Hostel Manager'::varchar, 'hostel_manager'::varchar, 'Hostel management staff'::text, 5::integer, true::boolean),
                (NULL::uuid, 'Asset Manager'::varchar, 'asset_manager'::varchar, 'Asset management staff'::text, 6::integer, true::boolean),
                (NULL::uuid, 'Security'::varchar, 'security'::varchar, 'Security staff'::text, 7::integer, true::boolean),
                (NULL::uuid, 'Maintenance'::varchar, 'maintenance'::varchar, 'Maintenance staff'::text, 8::integer, true::boolean),
                (NULL::uuid, 'Other'::varchar, 'other'::varchar, 'Other staff types'::text, 9::integer, true::boolean)
            ) AS v(org_id, name_val, code_val, desc_val, order_val, active_val)
            WHERE NOT EXISTS (
                SELECT 1 FROM public.staff_types st
                WHERE st.code = v.code_val
                AND (st.organization_id IS NULL AND v.org_id IS NULL)
                AND st.deleted_at IS NULL
            );
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
