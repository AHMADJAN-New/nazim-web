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
        Schema::create('branding_watermarks', function (Blueprint $table) {
            // UUID primary key
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));

            // Multi-tenancy
            $table->uuid('organization_id');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');

            // School branding reference
            $table->uuid('branding_id');
            $table->foreign('branding_id')->references('id')->on('school_branding')->onDelete('cascade');

            // Report key (optional - null means all reports)
            $table->string('report_key', 100)->nullable();

            // Watermark type and content
            $table->string('wm_type', 20)->default('text'); // text, image
            $table->binary('image_binary')->nullable();
            $table->string('image_mime', 50)->nullable();
            $table->text('text')->nullable();
            $table->string('font_family', 100)->nullable();
            $table->string('color', 7)->default('#000000');

            // Styling
            $table->float('opacity')->default(0.08);
            $table->integer('rotation_deg')->default(35);
            $table->float('scale')->default(1.0);
            $table->string('position', 30)->default('center'); // center, top-left, top-right, bottom-left, bottom-right
            $table->float('pos_x')->default(50.0); // percentage
            $table->float('pos_y')->default(50.0); // percentage
            $table->string('repeat_pattern', 20)->default('none'); // none, repeat, repeat-x, repeat-y

            // Ordering
            $table->integer('sort_order')->default(0);

            // Status
            $table->boolean('is_active')->default(true);

            // Timestamps
            $table->timestamps();
            $table->timestamp('deleted_at')->nullable();

            // Indexes
            $table->index('organization_id');
            $table->index('branding_id');
            $table->index('report_key');
            $table->index('is_active');
            $table->index('deleted_at');
        });

        // Create trigger for updated_at
        DB::statement("
            CREATE TRIGGER update_branding_watermarks_updated_at
                BEFORE UPDATE ON public.branding_watermarks
                FOR EACH ROW
                EXECUTE FUNCTION public.update_updated_at_column();
        ");

        // Add comment
        DB::statement("
            COMMENT ON TABLE public.branding_watermarks IS 'Watermark configurations for reports (text or image).';
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS update_branding_watermarks_updated_at ON public.branding_watermarks;');
        Schema::dropIfExists('branding_watermarks');
    }
};
