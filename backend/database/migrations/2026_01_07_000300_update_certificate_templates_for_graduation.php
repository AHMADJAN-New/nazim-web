<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('certificate_templates', function (Blueprint $table) {
            if (!Schema::hasColumn('certificate_templates', 'school_id')) {
                $table->uuid('school_id')->nullable()->after('organization_id')->index();
            }

            if (!Schema::hasColumn('certificate_templates', 'type')) {
                $table->string('type')->default('graduation')->after('course_id');
            }

            if (!Schema::hasColumn('certificate_templates', 'title')) {
                $table->string('title')->nullable()->after('name');
            }

            if (!Schema::hasColumn('certificate_templates', 'body_html')) {
                $table->longText('body_html')->nullable()->after('description');
            }

            if (!Schema::hasColumn('certificate_templates', 'page_size')) {
                $table->string('page_size', 20)->default('A4')->after('background_image_path');
            }

            if (!Schema::hasColumn('certificate_templates', 'custom_width_mm')) {
                $table->decimal('custom_width_mm', 8, 2)->nullable()->after('page_size');
            }

            if (!Schema::hasColumn('certificate_templates', 'custom_height_mm')) {
                $table->decimal('custom_height_mm', 8, 2)->nullable()->after('custom_width_mm');
            }

            if (!Schema::hasColumn('certificate_templates', 'rtl')) {
                $table->boolean('rtl')->default(true)->after('layout_config');
            }

            if (!Schema::hasColumn('certificate_templates', 'font_family')) {
                $table->string('font_family')->nullable()->after('rtl');
            }

            if (!Schema::hasColumn('certificate_templates', 'updated_by')) {
                $table->uuid('updated_by')->nullable()->after('created_by');
            }

            $table->index(['school_id', 'type'], 'idx_certificate_templates_school_type');
            $table->index(['school_id', 'is_active'], 'idx_certificate_templates_school_active');
        });
    }

    public function down(): void
    {
        Schema::table('certificate_templates', function (Blueprint $table) {
            if (Schema::hasColumn('certificate_templates', 'school_id')) {
                $table->dropIndex('idx_certificate_templates_school_type');
                $table->dropIndex('idx_certificate_templates_school_active');
                $table->dropColumn('school_id');
            }

            foreach ([
                'type',
                'title',
                'body_html',
                'page_size',
                'custom_width_mm',
                'custom_height_mm',
                'rtl',
                'font_family',
                'updated_by',
            ] as $column) {
                if (Schema::hasColumn('certificate_templates', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
