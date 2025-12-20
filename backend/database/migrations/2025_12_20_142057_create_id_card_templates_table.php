<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('id_card_templates', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id')->index();
            $table->uuid('school_id')->nullable();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('background_image_path_front')->nullable();
            $table->string('background_image_path_back')->nullable();
            $table->json('layout_config_front')->nullable();
            $table->json('layout_config_back')->nullable();
            $table->string('card_size')->default('CR80'); // CR80/ISO 7810 ID-1: 85.6mm × 53.98mm
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('set null');
        });

        // Create trigger for updated_at
        DB::statement("
            CREATE TRIGGER update_id_card_templates_updated_at
                BEFORE UPDATE ON public.id_card_templates
                FOR EACH ROW
                EXECUTE FUNCTION public.update_updated_at_column();
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS update_id_card_templates_updated_at ON public.id_card_templates;');
        Schema::dropIfExists('id_card_templates');
    }
};
