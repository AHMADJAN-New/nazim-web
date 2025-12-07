<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('certificate_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id')->index();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('background_image_path')->nullable();
            $table->json('layout_config')->nullable(); // Store position/style of text elements
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // Add certificate_template_id to course_students for issued certificates
        Schema::table('course_students', function (Blueprint $table) {
            $table->uuid('certificate_template_id')->nullable()->after('certificate_issued_date');
            $table->string('certificate_number')->nullable()->after('certificate_template_id');
        });
    }

    public function down(): void
    {
        Schema::table('course_students', function (Blueprint $table) {
            $table->dropColumn(['certificate_template_id', 'certificate_number']);
        });
        Schema::dropIfExists('certificate_templates');
    }
};
