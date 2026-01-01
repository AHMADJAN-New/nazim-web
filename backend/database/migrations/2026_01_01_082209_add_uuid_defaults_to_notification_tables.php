<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Add UUID defaults to notification table primary keys.
     */
    public function up(): void
    {
        // Add default UUID generation to notification_events.id
        DB::statement("ALTER TABLE notification_events ALTER COLUMN id SET DEFAULT gen_random_uuid()");
        
        // Add default UUID generation to notifications.id
        DB::statement("ALTER TABLE notifications ALTER COLUMN id SET DEFAULT gen_random_uuid()");
        
        // Add default UUID generation to notification_deliveries.id
        DB::statement("ALTER TABLE notification_deliveries ALTER COLUMN id SET DEFAULT gen_random_uuid()");
        
        // Add default UUID generation to notification_preferences.id
        DB::statement("ALTER TABLE notification_preferences ALTER COLUMN id SET DEFAULT gen_random_uuid()");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove defaults (not strictly necessary, but good practice)
        DB::statement("ALTER TABLE notification_events ALTER COLUMN id DROP DEFAULT");
        DB::statement("ALTER TABLE notifications ALTER COLUMN id DROP DEFAULT");
        DB::statement("ALTER TABLE notification_deliveries ALTER COLUMN id DROP DEFAULT");
        DB::statement("ALTER TABLE notification_preferences ALTER COLUMN id DROP DEFAULT");
    }
};
