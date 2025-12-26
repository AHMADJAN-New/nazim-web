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
        Schema::create('branding_layouts', function (Blueprint $table) {
            // UUID primary key
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));

            // Multi-tenancy
            $table->uuid('organization_id');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');

            // School branding reference
            $table->uuid('branding_id');
            $table->foreign('branding_id')->references('id')->on('school_branding')->onDelete('cascade');

            // Layout information
            $table->string('layout_name', 100);
            $table->string('page_size', 20)->default('A4'); // A4, A3, Letter
            $table->string('orientation', 20)->default('portrait'); // portrait, landscape
            $table->string('margins', 100)->default('15mm 12mm 18mm 12mm'); // top right bottom left
            $table->boolean('rtl')->default(true);

            // Header/Footer customization
            $table->text('header_html')->nullable();
            $table->text('footer_html')->nullable();
            $table->text('extra_css')->nullable();

            // Logo settings
            $table->boolean('show_primary_logo')->default(true);
            $table->boolean('show_secondary_logo')->default(true);
            $table->boolean('show_ministry_logo')->default(false);
            $table->integer('logo_height_px')->default(60);
            $table->integer('header_height_px')->default(100);
            $table->string('header_layout_style', 50)->default('three-column'); // three-column, two-column, centered

            // Status
            $table->boolean('is_active')->default(true);
            $table->boolean('is_default')->default(false);

            // Timestamps
            $table->timestamps();
            $table->timestamp('deleted_at')->nullable();

            // Indexes
            $table->index('organization_id');
            $table->index('branding_id');
            $table->index('is_active');
            $table->index('is_default');
            $table->index('deleted_at');
        });

        // Create trigger for updated_at
        DB::statement("
            CREATE TRIGGER update_branding_layouts_updated_at
                BEFORE UPDATE ON public.branding_layouts
                FOR EACH ROW
                EXECUTE FUNCTION public.update_updated_at_column();
        ");

        // Add comment
        DB::statement("
            COMMENT ON TABLE public.branding_layouts IS 'Page layout configurations for reports per school branding.';
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS update_branding_layouts_updated_at ON public.branding_layouts;');
        Schema::dropIfExists('branding_layouts');
    }
};
