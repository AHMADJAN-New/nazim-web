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
        Schema::table('report_templates', function (Blueprint $table) {
            // Add watermark_id column (nullable - if null, use branding's default watermark)
            // Sentinel UUID '00000000-0000-0000-0000-000000000000' means "no watermark"
            // Note: No foreign key constraint to allow sentinel UUID; validation handled in application layer
            $table->uuid('watermark_id')->nullable()->after('report_font_size');
            $table->index('watermark_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('report_templates', function (Blueprint $table) {
            // Drop index and column (no foreign key to drop)
            $table->dropIndex(['watermark_id']);
            $table->dropColumn('watermark_id');
        });
    }
};
