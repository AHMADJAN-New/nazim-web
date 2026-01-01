<?php

namespace Database\Seeders;

use App\Models\Notification;
use App\Models\NotificationDelivery;
use App\Models\NotificationEvent;
use App\Models\NotificationPreference;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class NotificationSeeder extends Seeder
{
    public function run(): void
    {
        $profile = DB::table('profiles')
            ->whereNotNull('organization_id')
            ->first();

        if (!$profile) {
            $this->command?->warn('Skipping notification seed data: no profiles found.');
            return;
        }

        $userEmail = DB::table('users')->where('id', $profile->id)->value('email');

        $event = NotificationEvent::create([
            'organization_id' => $profile->organization_id,
            'type' => 'doc.assigned',
            'actor_user_id' => $profile->id,
            'entity_type' => 'App\\Models\\IncomingDocument',
            'entity_id' => 'demo-document',
            'payload_json' => [
                'title' => 'Document assigned to you',
                'body' => 'Please review the incoming document by end of day.',
                'url' => '/dms/incoming',
            ],
        ]);

        $notification = Notification::create([
            'organization_id' => $profile->organization_id,
            'user_id' => $profile->id,
            'event_id' => $event->id,
            'title' => 'Document assigned to you',
            'body' => 'Please review the incoming document by end of day.',
            'url' => '/dms/incoming',
            'level' => 'info',
        ]);

        NotificationPreference::firstOrCreate(
            [
                'organization_id' => $profile->organization_id,
                'user_id' => $profile->id,
                'type' => 'doc.assigned',
            ],
            [
                'in_app_enabled' => true,
                'email_enabled' => true,
                'frequency' => 'instant',
            ]
        );

        if ($userEmail) {
            NotificationDelivery::create([
                'notification_id' => $notification->id,
                'user_id' => $profile->id,
                'event_id' => $event->id,
                'channel' => 'email',
                'to_address' => $userEmail,
                'status' => 'queued',
            ]);
        }
    }
}
