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
        Schema::table('help_center_articles', function (Blueprint $table) {
            // Add status enum (replaces is_published boolean)
            $table->string('status', 20)->default('draft')->after('is_pinned');
            
            // Add created_by and updated_by
            $table->uuid('created_by')->nullable()->after('author_id');
            $table->foreign('created_by')->references('id')->on('profiles')->onDelete('set null');
            
            $table->uuid('updated_by')->nullable()->after('created_by');
            $table->foreign('updated_by')->references('id')->on('profiles')->onDelete('set null');
            
            // Add archived_at
            $table->timestamp('archived_at')->nullable()->after('published_at');
            
            // Add indexes
            $table->index('status');
            $table->index('created_by');
            $table->index('updated_by');
            $table->index('archived_at');
        });

        // Migrate existing is_published to status
        DB::statement("
            UPDATE public.help_center_articles
            SET status = CASE 
                WHEN is_published = true THEN 'published'
                ELSE 'draft'
            END
        ");

        // Set created_by and updated_by from author_id for existing records
        DB::statement("
            UPDATE public.help_center_articles
            SET created_by = author_id,
                updated_by = author_id
            WHERE author_id IS NOT NULL
        ");

        // Add check constraint for status
        DB::statement("
            ALTER TABLE public.help_center_articles
            ADD CONSTRAINT help_articles_status_valid 
            CHECK (status IN ('draft', 'published', 'archived'))
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('help_center_articles', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropForeign(['updated_by']);
            $table->dropIndex(['status']);
            $table->dropIndex(['created_by']);
            $table->dropIndex(['updated_by']);
            $table->dropIndex(['archived_at']);
            $table->dropColumn(['status', 'created_by', 'updated_by', 'archived_at']);
        });

        DB::statement("
            ALTER TABLE public.help_center_articles
            DROP CONSTRAINT IF EXISTS help_articles_status_valid
        ");
    }
};
