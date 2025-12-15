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
        Schema::table('outgoing_documents', function (Blueprint $table) {
            $table->uuid('template_id')->nullable()->after('academic_year_id');
            $table->uuid('letterhead_id')->nullable()->after('template_id');
            $table->jsonb('template_variables')->nullable()->after('table_payload');

            // Add foreign keys
            $table->foreign('template_id')
                ->references('id')
                ->on('letter_templates')
                ->onDelete('set null');

            $table->foreign('letterhead_id')
                ->references('id')
                ->on('letterheads')
                ->onDelete('set null');

            // Add indexes
            $table->index('template_id');
            $table->index('letterhead_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('outgoing_documents', function (Blueprint $table) {
            $table->dropForeign(['template_id']);
            $table->dropForeign(['letterhead_id']);
            $table->dropIndex(['template_id']);
            $table->dropIndex(['letterhead_id']);

            $table->dropColumn([
                'template_id',
                'letterhead_id',
                'template_variables',
            ]);
        });
    }
};
