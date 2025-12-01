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
        // Create school_branding table
        Schema::create('school_branding', function (Blueprint $table) {
            // UUID primary key
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            
            // Multi-tenancy: organization_id is required
            $table->uuid('organization_id');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            
            // School information
            $table->string('school_name', 255);
            $table->string('school_name_arabic', 255)->nullable();
            $table->string('school_name_pashto', 255)->nullable();
            $table->text('school_address')->nullable();
            $table->string('school_phone', 50)->nullable();
            $table->string('school_email', 100)->nullable();
            $table->string('school_website', 200)->nullable();
            
            // Branding assets (file paths)
            $table->text('logo_path')->nullable();
            $table->text('header_image_path')->nullable();
            $table->text('footer_text')->nullable();
            
            // Color scheme
            $table->string('primary_color', 7)->default('#0b0b56');
            $table->string('secondary_color', 7)->default('#0056b3');
            $table->string('accent_color', 7)->default('#ff6b35');
            
            // Typography
            $table->string('font_family', 100)->default('Bahij Nassim');
            $table->string('report_font_size', 10)->default('12px');
            
            // Logo binary data (BYTEA in PostgreSQL)
            $table->binary('primary_logo_binary')->nullable();
            $table->string('primary_logo_mime_type', 100)->nullable();
            $table->string('primary_logo_filename', 255)->nullable();
            $table->integer('primary_logo_size')->nullable();
            
            $table->binary('secondary_logo_binary')->nullable();
            $table->string('secondary_logo_mime_type', 100)->nullable();
            $table->string('secondary_logo_filename', 255)->nullable();
            $table->integer('secondary_logo_size')->nullable();
            
            $table->binary('ministry_logo_binary')->nullable();
            $table->string('ministry_logo_mime_type', 100)->nullable();
            $table->string('ministry_logo_filename', 255)->nullable();
            $table->integer('ministry_logo_size')->nullable();
            
            // Logo usage settings
            $table->string('primary_logo_usage', 100)->default('reports');
            $table->string('secondary_logo_usage', 100)->default('certificates');
            $table->string('ministry_logo_usage', 100)->default('official_documents');
            
            // Report settings
            $table->text('header_text')->nullable();
            $table->boolean('table_alternating_colors')->default(true);
            $table->boolean('show_page_numbers')->default(true);
            $table->boolean('show_generation_date')->default(true);
            $table->string('report_logo_selection', 50)->default('primary,secondary');
            
            // Calendar preference
            $table->string('calendar_preference', 20)->default('jalali');
            
            // Status
            $table->boolean('is_active')->default(true);
            
            // Timestamps
            $table->timestamps();
            $table->timestamp('deleted_at')->nullable();
            
            // Indexes
            $table->index('organization_id');
            $table->index('is_active');
            $table->index('deleted_at');
        });

        // Create trigger for updated_at
        DB::statement("
            CREATE TRIGGER update_school_branding_updated_at
                BEFORE UPDATE ON public.school_branding
                FOR EACH ROW
                EXECUTE FUNCTION public.update_updated_at_column();
        ");

        // Add comment
        DB::statement("
            COMMENT ON TABLE public.school_branding IS 'Branding + school metadata per organization.';
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS update_school_branding_updated_at ON public.school_branding;');
        Schema::dropIfExists('school_branding');
    }
};
