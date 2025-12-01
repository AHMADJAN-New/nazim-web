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
        if (!Schema::hasTable('residency_types')) {
            Schema::create('residency_types', function (Blueprint $table) {
                // UUID primary key
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                
                // Multi-tenancy: organization_id is nullable (NULL = global types)
                $table->uuid('organization_id')->nullable();
                $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
                
                // Residency type information
                $table->string('name', 100);
                $table->string('code', 50);
                $table->text('description')->nullable();
                $table->boolean('is_active')->default(true);
                
                // Timestamps
                $table->timestamps();
                $table->timestamp('deleted_at')->nullable();
                
                // Indexes
                $table->index('organization_id');
                $table->index('is_active');
                $table->index('deleted_at');
            });
            
            // Create unique index for code per organization (handles NULL organization_id)
            // PostgreSQL handles NULL values in unique constraints properly
            DB::statement("
                CREATE UNIQUE INDEX idx_residency_types_unique_code_per_org 
                ON public.residency_types (code, organization_id)
                WHERE deleted_at IS NULL;
            ");
            
            // Create trigger for updated_at
            DB::statement("
                CREATE TRIGGER update_residency_types_updated_at
                    BEFORE UPDATE ON public.residency_types
                    FOR EACH ROW
                    EXECUTE FUNCTION public.update_updated_at_column();
            ");
            
            // Add comment
            DB::statement("
                COMMENT ON TABLE public.residency_types IS 'Residency types (نهاري - Day, لیلیه - Night) with organization isolation. NULL organization_id = global types available to all organizations.';
            ");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('residency_types');
    }
};
