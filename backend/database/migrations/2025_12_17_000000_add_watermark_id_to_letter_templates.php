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
        if (!Schema::hasColumn('letter_templates', 'watermark_id')) {
            Schema::table('letter_templates', function (Blueprint $table) {
                $table->uuid('watermark_id')->nullable()->after('letterhead_id');
                $table->foreign('watermark_id')
                    ->references('id')
                    ->on('letterheads')
                    ->onDelete('set null');
                $table->index('watermark_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('letter_templates', 'watermark_id')) {
            Schema::table('letter_templates', function (Blueprint $table) {
                $table->dropForeign(['watermark_id']);
                $table->dropIndex(['watermark_id']);
                $table->dropColumn('watermark_id');
            });
        }
    }
};

