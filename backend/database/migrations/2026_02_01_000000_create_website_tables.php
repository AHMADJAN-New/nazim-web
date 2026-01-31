<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('website_settings', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->string('school_slug', 80)->unique();
            $table->string('default_language', 10)->default('en');
            $table->jsonb('enabled_languages')->default(DB::raw("'[]'::jsonb"));
            $table->jsonb('theme')->nullable();
            $table->boolean('is_public')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');

            $table->index(['organization_id', 'school_id']);
            $table->index(['school_id', 'is_public']);
        });

        Schema::create('website_pages', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->string('slug', 120);
            $table->string('title', 200);
            $table->string('status', 20)->default('draft');
            $table->jsonb('content_json')->nullable();
            $table->string('seo_title', 200)->nullable();
            $table->string('seo_description', 400)->nullable();
            $table->text('seo_image_path')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
            $table->index(['school_id', 'slug']);
            $table->index(['school_id', 'status', 'published_at']);
        });

        Schema::create('website_posts', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->string('slug', 120);
            $table->string('title', 200);
            $table->string('status', 20)->default('draft');
            $table->text('excerpt')->nullable();
            $table->jsonb('content_json')->nullable();
            $table->string('seo_title', 200)->nullable();
            $table->string('seo_description', 400)->nullable();
            $table->text('seo_image_path')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
            $table->index(['school_id', 'slug']);
            $table->index(['school_id', 'status', 'published_at']);
        });

        Schema::create('website_events', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->string('title', 200);
            $table->string('location', 200)->nullable();
            $table->timestamp('starts_at');
            $table->timestamp('ends_at')->nullable();
            $table->boolean('is_public')->default(true);
            $table->text('summary')->nullable();
            $table->jsonb('content_json')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
            $table->index(['school_id', 'starts_at']);
            $table->index(['school_id', 'is_public']);
        });

        Schema::create('website_media', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->uuid('category_id')->nullable();
            $table->string('type', 30)->default('image');
            $table->text('file_path');
            $table->string('file_name', 255)->nullable();
            $table->string('alt_text', 255)->nullable();
            $table->jsonb('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
            $table->foreign('category_id')->references('id')->on('website_media_categories')->onDelete('set null');
            $table->index(['school_id', 'type']);
        });

        Schema::create('website_domains', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->string('domain', 255)->unique();
            $table->boolean('is_primary')->default(false);
            $table->string('verification_status', 30)->default('pending');
            $table->string('ssl_status', 30)->default('pending');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
            $table->index(['school_id', 'verification_status']);
        });

        Schema::create('website_menu_links', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->uuid('parent_id')->nullable();
            $table->string('label', 120);
            $table->string('url', 255);
            $table->integer('sort_order')->default(0);
            $table->boolean('is_visible')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
            $table->index(['school_id', 'sort_order']);
        });

        // Add self-referencing foreign key after table creation
        Schema::table('website_menu_links', function (Blueprint $table) {
            $table->foreign('parent_id')->references('id')->on('website_menu_links')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('website_menu_links');
        Schema::dropIfExists('website_domains');
        Schema::dropIfExists('website_media');
        Schema::dropIfExists('website_events');
        Schema::dropIfExists('website_posts');
        Schema::dropIfExists('website_pages');
        Schema::dropIfExists('website_settings');
    }
};
