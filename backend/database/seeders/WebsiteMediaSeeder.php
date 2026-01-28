<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;
use App\Models\WebsiteMediaCategory;

class WebsiteMediaSeeder extends Seeder
{
    protected string $organizationId;
    protected string $schoolId;

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get platform admin organization and school
        if (!$this->getPlatformAdminOrgAndSchool()) {
            return;
        }

        $now = Carbon::now();

        // 1. Create Media Categories (Albums)
        $categories = [
            [
                'name' => 'Campus Life',
                'description' => 'Everyday moments around our beautiful campus.',
                'cover_image_path' => 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1200',
            ],
            [
                'name' => 'Events',
                'description' => 'Highlights from our annual events and gatherings.',
                'cover_image_path' => 'https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=1200',
            ],
            [
                'name' => 'Sports',
                'description' => 'Our students in action during sports activities.',
                'cover_image_path' => 'https://images.unsplash.com/photo-1510531704581-5b2870972060?q=80&w=1200',
            ],
            [
                'name' => 'Academics',
                'description' => 'Classroom activities and learning achievements.',
                'cover_image_path' => 'https://images.unsplash.com/photo-1592280771800-45cb4985cb41?q=80&w=1200',
            ],
        ];

        $categoryMap = [];

        foreach ($categories as $catData) {
            $slug = Str::slug($catData['name']);
            $category = WebsiteMediaCategory::firstOrCreate(
                [
                    'school_id' => $this->schoolId,
                    'slug' => $slug,
                ],
                [
                    'id' => (string) Str::uuid(),
                    'organization_id' => $this->organizationId,
                    'name' => $catData['name'],
                    'description' => $catData['description'],
                    'cover_image_path' => $catData['cover_image_path'],
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
            $categoryMap[$slug] = $category->id;
        }

        // 2. Insert Media Items with Category IDs
        $mediaItems = [
            [
                'id' => (string) Str::uuid(),
                'organization_id' => $this->organizationId,
                'school_id' => $this->schoolId,
                'category_id' => $categoryMap['campus-life'],
                'type' => 'image',
                'file_path' => 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1200',
                'file_name' => 'campus_garden.jpg',
                'alt_text' => 'Beautiful spring day at the campus',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => (string) Str::uuid(),
                'organization_id' => $this->organizationId,
                'school_id' => $this->schoolId,
                'category_id' => $categoryMap['academics'],
                'type' => 'image',
                'file_path' => 'https://images.unsplash.com/photo-1592280771800-45cb4985cb41?q=80&w=1200',
                'file_name' => 'library_interior.jpg',
                'alt_text' => 'Students studying in silence',
                'created_at' => $now->copy()->subDays(1),
                'updated_at' => $now->copy()->subDays(1),
            ],
            [
                'id' => (string) Str::uuid(),
                'organization_id' => $this->organizationId,
                'school_id' => $this->schoolId,
                'category_id' => $categoryMap['sports'],
                'type' => 'image',
                'file_path' => 'https://images.unsplash.com/photo-1510531704581-5b2870972060?q=80&w=1200',
                'file_name' => 'sports_day.jpg',
                'alt_text' => 'Annual sports competition',
                'created_at' => $now->copy()->subDays(2),
                'updated_at' => $now->copy()->subDays(2),
            ],
            [
                'id' => (string) Str::uuid(),
                'organization_id' => $this->organizationId,
                'school_id' => $this->schoolId,
                'category_id' => $categoryMap['campus-life'],
                'type' => 'video',
                'file_path' => 'https://www.youtube.com/watch?v=Get7rqXYrbQ',
                'file_name' => 'campus_drone_tour.mp4',
                'alt_text' => 'Campus Aerial Tour',
                'created_at' => $now->copy()->subDays(3),
                'updated_at' => $now->copy()->subDays(3),
            ],
            [
                'id' => (string) Str::uuid(),
                'organization_id' => $this->organizationId,
                'school_id' => $this->schoolId,
                'category_id' => $categoryMap['events'],
                'type' => 'image',
                'file_path' => 'https://images.unsplash.com/photo-1427504746074-ce47bdb1a262?q=80&w=1200',
                'file_name' => 'graduation_ceremony.jpg',
                'alt_text' => 'Graduation Ceremony 2024',
                'created_at' => $now->copy()->subDays(5),
                'updated_at' => $now->copy()->subDays(5),
            ],
            [
                'id' => (string) Str::uuid(),
                'organization_id' => $this->organizationId,
                'school_id' => $this->schoolId,
                'category_id' => null, // No category
                'type' => 'audio',
                'file_path' => 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                'file_name' => 'recitation.mp3',
                'alt_text' => 'Quran Recitation - Morning Assembly',
                'created_at' => $now->copy()->subDays(6),
                'updated_at' => $now->copy()->subDays(6),
            ]
        ];

        // Insert logic
        foreach ($mediaItems as $item) {
            // Check if exists by filename to avoid duplicates on re-run
            $exists = DB::table('website_media')
                ->where('file_name', $item['file_name'])
                ->where('school_id', $this->schoolId)
                ->exists();
            if (!$exists) {
                DB::table('website_media')->insert($item);
            } else {
                // Update category if needed
                DB::table('website_media')
                    ->where('file_name', $item['file_name'])
                    ->where('school_id', $this->schoolId)
                    ->update(['category_id' => $item['category_id']]);
            }
        }

        $this->command->info('✓ Website media & categories seeded successfully!');
    }

    /**
     * Get platform admin organization and school
     */
    protected function getPlatformAdminOrgAndSchool(): bool
    {
        $platformAdminEmail = 'platform-admin@nazim.app';
        $platformUser = DB::table('users')
            ->where('email', $platformAdminEmail)
            ->first();

        if (!$platformUser) {
            $this->command->error("Platform admin user not found: {$platformAdminEmail}");
            $this->command->error("Please run PlatformAdminSeeder first.");
            return false;
        }

        $profile = DB::table('profiles')
            ->where('id', $platformUser->id)
            ->first();

        if (!$profile || !$profile->organization_id) {
            $this->command->error("Platform admin user does not have an organization assigned.");
            return false;
        }

        $this->organizationId = $profile->organization_id;

        // Get school
        $school = DB::table('school_branding')
            ->where('organization_id', $this->organizationId)
            ->whereNull('deleted_at')
            ->first();

        if (!$school) {
            $this->command->error("No school found for organization: {$this->organizationId}");
            return false;
        }

        $this->schoolId = $school->id;
        $this->command->info("Using organization: {$this->organizationId}");
        $this->command->info("Using school: {$school->school_name}");

        return true;
    }
}
