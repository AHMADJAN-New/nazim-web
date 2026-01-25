<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Public Books/Library (PDFs, downloadable resources)
        Schema::create('website_public_books', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->string('title', 255);
            $table->string('author', 255)->nullable();
            $table->string('category', 100)->nullable();
            $table->text('description')->nullable();
            $table->text('cover_image_path')->nullable();
            $table->text('file_path')->nullable();
            $table->bigInteger('file_size')->nullable();
            $table->integer('download_count')->default(0);
            $table->boolean('is_featured')->default(false);
            $table->integer('sort_order')->default(0);
            $table->string('status', 20)->default('draft');
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
            $table->index(['school_id', 'status']);
            $table->index(['school_id', 'category']);
            $table->index(['school_id', 'is_featured']);
        });

        // Public Scholar Profiles
        Schema::create('website_scholars', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->string('name', 200);
            $table->string('title', 100)->nullable();
            $table->text('bio')->nullable();
            $table->text('photo_path')->nullable();
            $table->jsonb('specializations')->nullable();
            $table->string('contact_email', 255)->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_featured')->default(false);
            $table->string('status', 20)->default('draft');
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
            $table->index(['school_id', 'status']);
            $table->index(['school_id', 'is_featured']);
        });

        // Public Course Catalog
        Schema::create('website_courses', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->string('title', 200);
            $table->string('category', 100)->nullable();
            $table->text('description')->nullable();
            $table->string('duration', 50)->nullable();
            $table->string('level', 50)->nullable();
            $table->string('instructor_name', 200)->nullable();
            $table->text('cover_image_path')->nullable();
            $table->string('enrollment_cta', 255)->nullable();
            $table->boolean('is_featured')->default(false);
            $table->integer('sort_order')->default(0);
            $table->string('status', 20)->default('draft');
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
            $table->index(['school_id', 'status']);
            $table->index(['school_id', 'category']);
            $table->index(['school_id', 'is_featured']);
        });

        // Graduates/Alumni Showcase
        Schema::create('website_graduates', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->string('name', 200);
            $table->integer('graduation_year')->nullable();
            $table->string('program', 200)->nullable();
            $table->text('photo_path')->nullable();
            $table->text('bio')->nullable();
            $table->boolean('is_featured')->default(false);
            $table->integer('sort_order')->default(0);
            $table->string('status', 20)->default('draft');
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
            $table->index(['school_id', 'status']);
            $table->index(['school_id', 'graduation_year']);
            $table->index(['school_id', 'is_featured']);
        });

        // Donation Funds Configuration
        Schema::create('website_donations', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->string('title', 200);
            $table->text('description')->nullable();
            $table->decimal('target_amount', 15, 2)->nullable();
            $table->decimal('current_amount', 15, 2)->default(0);
            $table->jsonb('bank_details')->nullable();
            $table->jsonb('payment_links')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
            $table->index(['school_id', 'is_active']);
        });

        // Contact Form Inbox
        Schema::create('website_inbox', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('organization_id');
            $table->uuid('school_id');
            $table->string('name', 200);
            $table->string('email', 255)->nullable();
            $table->string('phone', 50)->nullable();
            $table->string('subject', 255)->nullable();
            $table->text('message');
            $table->string('status', 20)->default('new');
            $table->timestamp('replied_at')->nullable();
            $table->uuid('replied_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('school_id')->references('id')->on('school_branding')->onDelete('cascade');
            $table->index(['school_id', 'status']);
            $table->index(['school_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('website_inbox');
        Schema::dropIfExists('website_donations');
        Schema::dropIfExists('website_graduates');
        Schema::dropIfExists('website_courses');
        Schema::dropIfExists('website_scholars');
        Schema::dropIfExists('website_public_books');
    }
};
