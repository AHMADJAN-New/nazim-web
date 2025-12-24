<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Adds fields to support event-specific users:
     * - event_id: Links user to a specific event (nullable)
     * - is_event_user: Flag to identify event-specific users
     */
    public function up(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->uuid('event_id')->nullable()->after('organization_id');
            $table->boolean('is_event_user')->default(false)->after('event_id');
            
            $table->foreign('event_id')
                ->references('id')
                ->on('events')
                ->onDelete('cascade');
            
            $table->index('event_id');
            $table->index('is_event_user');
            $table->index(['is_event_user', 'event_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->dropForeign(['event_id']);
            $table->dropIndex(['event_id']);
            $table->dropIndex(['is_event_user']);
            $table->dropIndex(['is_event_user', 'event_id']);
            $table->dropColumn(['event_id', 'is_event_user']);
        });
    }
};
