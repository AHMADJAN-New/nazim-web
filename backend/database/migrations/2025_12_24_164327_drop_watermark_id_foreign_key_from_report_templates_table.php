<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('report_templates', function (Blueprint $table) {
            // Drop the foreign key constraint to allow sentinel UUID '00000000-0000-0000-0000-000000000000'
            // for "no watermark" option
            // Validation is handled in the application layer
            $table->dropForeign(['watermark_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('report_templates', function (Blueprint $table) {
            // Re-add the foreign key constraint (if needed for rollback)
            $table->foreign('watermark_id')
                ->references('id')
                ->on('branding_watermarks')
                ->onDelete('set null');
        });
    }
};
