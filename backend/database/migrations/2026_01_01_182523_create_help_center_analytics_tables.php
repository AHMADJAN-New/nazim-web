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
        // Table to track article views per user/session per day (prevent inflation)
        Schema::create('help_center_article_views', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('article_id');
            $table->foreign('article_id')->references('id')->on('help_center_articles')->onDelete('cascade');
            
            // Track by user_id if authenticated, or session_id if anonymous
            $table->uuid('user_id')->nullable();
            $table->foreign('user_id')->references('id')->on('profiles')->onDelete('cascade');
            $table->string('session_id', 255)->nullable();
            
            // Track by date (YYYY-MM-DD) to allow one view per day
            $table->date('view_date');
            
            $table->integer('view_count')->default(1); // Allow multiple views in same day, but track count
            $table->timestamp('first_viewed_at');
            $table->timestamp('last_viewed_at');
            
            $table->timestamps();
            
            // Unique constraint: one record per (article_id, user_id OR session_id, view_date)
            $table->unique(['article_id', 'user_id', 'view_date'], 'help_views_article_user_date_unique');
            $table->unique(['article_id', 'session_id', 'view_date'], 'help_views_article_session_date_unique');
            
            // Indexes
            $table->index('article_id');
            $table->index('user_id');
            $table->index('session_id');
            $table->index('view_date');
        });

        // Table to track helpful/not helpful votes (prevent duplicate votes)
        Schema::create('help_center_article_votes', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('article_id');
            $table->foreign('article_id')->references('id')->on('help_center_articles')->onDelete('cascade');
            
            // Track by user_id if authenticated, or session_id if anonymous
            $table->uuid('user_id')->nullable();
            $table->foreign('user_id')->references('id')->on('profiles')->onDelete('cascade');
            $table->string('session_id', 255)->nullable();
            
            // Vote type: 'helpful' or 'not_helpful'
            $table->string('vote_type', 20);
            
            $table->timestamps();
            
            // Unique constraint: one vote per (article_id, user_id OR session_id)
            $table->unique(['article_id', 'user_id'], 'help_votes_article_user_unique');
            $table->unique(['article_id', 'session_id'], 'help_votes_article_session_unique');
            
            // Indexes
            $table->index('article_id');
            $table->index('user_id');
            $table->index('session_id');
            $table->index('vote_type');
        });

        // Add check constraint for vote_type
        DB::statement("
            ALTER TABLE public.help_center_article_votes
            ADD CONSTRAINT help_votes_type_valid 
            CHECK (vote_type IN ('helpful', 'not_helpful'))
        ");

        // Add comments
        DB::statement("
            COMMENT ON TABLE public.help_center_article_views IS 'Tracks article views per user/session per day to prevent view count inflation.';
        ");
        DB::statement("
            COMMENT ON TABLE public.help_center_article_votes IS 'Tracks helpful/not helpful votes per user/session to prevent duplicate votes.';
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("
            ALTER TABLE public.help_center_article_votes
            DROP CONSTRAINT IF EXISTS help_votes_type_valid
        ");
        
        Schema::dropIfExists('help_center_article_votes');
        Schema::dropIfExists('help_center_article_views');
    }
};
