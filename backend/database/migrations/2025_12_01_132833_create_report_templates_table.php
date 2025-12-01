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
        if (!Schema::hasTable('report_templates')) {
            Schema::create('report_templates', function (Blueprint $table) {
                // UUID primary key
                $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
                
                // Multi-tenancy: organization_id is required
                $table->uuid('organization_id');
                $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
                
                // School scoping: school_id is required
                $table->uuid('school_id');
                $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
                
                // Template information
                $table->string('template_name', 255);
                $table->string('template_type', 100);
                $table->text('header_text')->nullable();
                $table->text('footer_text')->nullable();
                $table->text('header_html')->nullable();
                $table->text('footer_html')->nullable();
                $table->string('report_logo_selection', 50)->nullable();
                $table->boolean('show_page_numbers')->default(true);
                $table->boolean('show_generation_date')->default(true);
                $table->boolean('table_alternating_colors')->default(true);
                $table->string('report_font_size', 10)->nullable();
                $table->boolean('is_default')->default(false);
                $table->boolean('is_active')->default(true);
                
                // Timestamps
                $table->timestamps();
                $table->timestamp('deleted_at')->nullable();
                
                // Indexes
                $table->index('organization_id');
                $table->index('school_id');
                $table->index('template_type');
                $table->index('is_active');
                $table->index('is_default');
                $table->index('deleted_at');
            });
            
            // Create unique index for template_name per school (handles soft deletes)
            // PostgreSQL handles NULL values in unique constraints properly
            DB::statement("
                CREATE UNIQUE INDEX idx_report_templates_unique_name_per_school 
                ON public.report_templates (school_id, template_name, deleted_at)
                WHERE deleted_at IS NULL;
            ");
            
            // Create trigger for updated_at
            DB::statement("
                CREATE TRIGGER update_report_templates_updated_at
                    BEFORE UPDATE ON public.report_templates
                    FOR EACH ROW
                    EXECUTE FUNCTION public.update_updated_at_column();
            ");
            
            // Add comment
            DB::statement("
                COMMENT ON TABLE public.report_templates IS 'Customizable report templates per school with organization isolation.';
            ");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('report_templates');
    }
};
