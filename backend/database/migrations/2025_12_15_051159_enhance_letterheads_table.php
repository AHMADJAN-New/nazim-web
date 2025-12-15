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
        Schema::table('letterheads', function (Blueprint $table) {
            $table->string('file_type', 20)->default('image')->after('file_path');
            $table->string('letter_type', 50)->nullable()->after('name');
            $table->string('position', 20)->default('header')->after('default_for_layout');
            $table->string('preview_url', 255)->nullable()->after('position');

            // Add indexes
            $table->index('letter_type');
            $table->index('file_type');
            $table->index(['letter_type', 'active']);
            $table->index(['file_type', 'active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('letterheads', function (Blueprint $table) {
            $table->dropIndex(['letter_type']);
            $table->dropIndex(['file_type']);
            $table->dropIndex(['letter_type', 'active']);
            $table->dropIndex(['file_type', 'active']);

            $table->dropColumn([
                'file_type',
                'letter_type',
                'position',
                'preview_url',
            ]);
        });
    }
};
