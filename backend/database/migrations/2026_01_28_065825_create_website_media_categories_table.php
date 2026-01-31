<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('website_media_categories', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->string('name', 200);
            $table->string('slug', 200);
            $table->text('description')->nullable();
            $table->text('cover_image_path')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
            $table->index(['school_id', 'slug']);
        });

        // Note: category_id column will be added to website_media in a later migration
        // after the website_media table is created (2026_02_01_000000_create_website_tables.php)
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Only drop category_id from website_media if the table exists and column exists
        if (Schema::hasTable('website_media') && Schema::hasColumn('website_media', 'category_id')) {
            Schema::table('website_media', function (Blueprint $table) {
                $table->dropForeign(['category_id']);
                $table->dropColumn('category_id');
            });
        }

        Schema::dropIfExists('website_media_categories');
    }
};
