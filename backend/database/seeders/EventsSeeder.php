<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\Event;
use App\Models\EventType;
use App\Models\EventTypeField;
use App\Models\EventTypeFieldGroup;
use App\Models\EventGuest;

class EventsSeeder extends Seeder
{
    /**
     * Seed the events module with test data.
     * Creates 10,000 guests for performance testing.
     */
    public function run(): void
    {
        $this->command->info('Starting Events Seeder...');

        // Get a random organization and school
        $org = DB::table('organizations')->first();
        if (!$org) {
            $this->command->error('No organization found. Please run OrganizationSeeder first.');
            return;
        }

        $school = DB::table('school_branding')->where('organization_id', $org->id)->first();
        if (!$school) {
            $this->command->error('No school found. Please create a school first.');
            return;
        }

        $user = DB::table('users')->first();
        if (!$user) {
            $this->command->error('No user found. Please create a user first.');
            return;
        }

        $this->command->info("Using organization: {$org->name}");
        $this->command->info("Using school: {$school->school_name}");

        // Create Event Type with dynamic fields
        $this->command->info('Creating Event Type...');
        $eventType = EventType::create([
            'organization_id' => $org->id,
            'school_id' => $school->id,
            'name' => 'Graduation Ceremony',
            'description' => 'Annual graduation ceremony for students',
            'is_active' => true,
        ]);

        // Create field groups
        $contactGroup = EventTypeFieldGroup::create([
            'event_type_id' => $eventType->id,
            'title' => 'Contact Information',
            'sort_order' => 0,
        ]);

        $identityGroup = EventTypeFieldGroup::create([
            'event_type_id' => $eventType->id,
            'title' => 'Identity',
            'sort_order' => 1,
        ]);

        $addressGroup = EventTypeFieldGroup::create([
            'event_type_id' => $eventType->id,
            'title' => 'Address',
            'sort_order' => 2,
        ]);

        // Create fields
        $fields = [
            [
                'field_group_id' => $contactGroup->id,
                'key' => 'email',
                'label' => 'Email',
                'field_type' => 'email',
                'is_required' => false,
                'sort_order' => 0,
            ],
            [
                'field_group_id' => $contactGroup->id,
                'key' => 'secondary_phone',
                'label' => 'Secondary Phone',
                'field_type' => 'phone',
                'is_required' => false,
                'sort_order' => 1,
            ],
            [
                'field_group_id' => $identityGroup->id,
                'key' => 'tazkira_number',
                'label' => 'Tazkira Number',
                'field_type' => 'id_number',
                'is_required' => false,
                'sort_order' => 0,
            ],
            [
                'field_group_id' => $addressGroup->id,
                'key' => 'province',
                'label' => 'Province',
                'field_type' => 'select',
                'is_required' => false,
                'sort_order' => 0,
                'options' => [
                    ['value' => 'kabul', 'label' => 'Kabul'],
                    ['value' => 'herat', 'label' => 'Herat'],
                    ['value' => 'mazar', 'label' => 'Mazar-i-Sharif'],
                    ['value' => 'kandahar', 'label' => 'Kandahar'],
                    ['value' => 'jalalabad', 'label' => 'Jalalabad'],
                ],
            ],
            [
                'field_group_id' => $addressGroup->id,
                'key' => 'district',
                'label' => 'District',
                'field_type' => 'text',
                'is_required' => false,
                'sort_order' => 1,
            ],
            [
                'field_group_id' => $addressGroup->id,
                'key' => 'full_address',
                'label' => 'Full Address',
                'field_type' => 'address',
                'is_required' => false,
                'sort_order' => 2,
            ],
        ];

        foreach ($fields as $fieldData) {
            EventTypeField::create(array_merge($fieldData, [
                'event_type_id' => $eventType->id,
                'is_enabled' => true,
            ]));
        }

        // Create Event
        $this->command->info('Creating Event...');
        $event = Event::create([
            'organization_id' => $org->id,
            'school_id' => $school->id,
            'event_type_id' => $eventType->id,
            'title' => 'Graduation Ceremony 2024 - 10K Guests Test',
            'starts_at' => now()->addDays(30),
            'ends_at' => now()->addDays(30)->addHours(4),
            'venue' => 'Main Auditorium',
            'capacity' => 12000,
            'status' => 'published',
            'created_by' => $user->id,
        ]);

        // Generate 10,000 guests
        $this->command->info('Generating 10,000 guests...');
        $guestTypes = ['student', 'parent', 'teacher', 'staff', 'vip', 'external'];
        $firstNames = ['Ahmad', 'Mohammad', 'Abdul', 'Fatima', 'Zahra', 'Maryam', 'Hassan', 'Hussein', 'Ali', 'Omar', 'Khalid', 'Yusuf', 'Ibrahim', 'Aisha', 'Khadija'];
        $lastNames = ['Khan', 'Ahmadi', 'Rahimi', 'Karimi', 'Hashimi', 'Noori', 'Stanikzai', 'Wardak', 'Ghafari', 'Mohammadi', 'Nazari', 'Amiri', 'Barakzai'];

        $batchSize = 500;
        $totalGuests = 10000;
        $batches = ceil($totalGuests / $batchSize);

        for ($batch = 0; $batch < $batches; $batch++) {
            $guests = [];
            $startIndex = $batch * $batchSize;
            $endIndex = min($startIndex + $batchSize, $totalGuests);

            for ($i = $startIndex; $i < $endIndex; $i++) {
                $firstName = $firstNames[array_rand($firstNames)];
                $lastName = $lastNames[array_rand($lastNames)];
                $guestType = $guestTypes[array_rand($guestTypes)];
                $inviteCount = $guestType === 'vip' ? rand(2, 5) : rand(1, 3);
                $arrivedCount = rand(0, 1) ? rand(0, $inviteCount) : 0;

                $guests[] = [
                    'id' => (string) Str::uuid(),
                    'event_id' => $event->id,
                    'organization_id' => $org->id,
                    'school_id' => $school->id,
                    'guest_code' => 'G' . base_convert(time(), 10, 36) . strtoupper(Str::random(4)),
                    'guest_type' => $guestType,
                    'full_name' => $firstName . ' ' . $lastName,
                    'phone' => '07' . rand(10000000, 99999999),
                    'invite_count' => $inviteCount,
                    'arrived_count' => $arrivedCount,
                    'status' => $arrivedCount > 0 ? 'checked_in' : 'invited',
                    'qr_token' => base64_encode(hash('sha256', $event->id . Str::uuid() . Str::random(16), true)),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            DB::table('event_guests')->insert($guests);
            $this->command->info('Inserted batch ' . ($batch + 1) . '/' . $batches . ' (' . count($guests) . ' guests)');
        }

        // Calculate stats
        $stats = DB::table('event_guests')
            ->where('event_id', $event->id)
            ->selectRaw('COUNT(*) as total, SUM(invite_count) as invited, SUM(arrived_count) as arrived')
            ->first();

        $this->command->info('');
        $this->command->info('===== Seeding Complete =====');
        $this->command->info("Event Type ID: {$eventType->id}");
        $this->command->info("Event ID: {$event->id}");
        $this->command->info("Total Guests: {$stats->total}");
        $this->command->info("Total Invited: {$stats->invited}");
        $this->command->info("Total Arrived: {$stats->arrived}");
        $this->command->info('============================');
    }
}
