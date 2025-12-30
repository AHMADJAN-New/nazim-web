<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\SchoolBranding;
use Illuminate\Database\Seeder;

class SchoolBrandingSeeder extends Seeder
{
    /**
     * Seed the school branding table.
     *
     * Creates at least one school per organization (excluding platform-global).
     */
    public function run(): void
    {
        $this->command->info('Seeding schools...');

        $organizations = Organization::whereNull('deleted_at')
            ->where('slug', '!=', 'platform-global')
            ->get();

        if ($organizations->isEmpty()) {
            $this->command->warn('No organizations found. Please run DatabaseSeeder first.');
            return;
        }

        foreach ($organizations as $organization) {
            $schools = $this->getSchoolDefinitions($organization);

            foreach ($schools as $school) {
                $this->createSchool(
                    $organization->id,
                    $school['name'],
                    $school['name_ar'] ?? $school['name'],
                    $school['name_ps'] ?? $school['name'],
                    $school['address'] ?? '',
                    $school['phone'] ?? '',
                    $school['email'] ?? '',
                    $school['website'] ?? ''
                );
            }
        }

        $this->command->info('Schools seeded successfully.');
    }

    /**
     * Get school definitions for an organization.
     */
    protected function getSchoolDefinitions(Organization $organization): array
    {
        $slug = $organization->slug ?: 'org';
        $slugToken = preg_replace('/[^a-z0-9]+/', '', strtolower($slug));
        $baseName = $organization->name ?: 'School';
        $baseContact = [
            'address' => 'Kabul, Afghanistan',
            'phone' => '+93-20-123-4567',
            'email' => "{$slugToken}@example.com",
            'website' => "https://{$slugToken}.example.com",
        ];

        return [
            array_merge($baseContact, [
                'name' => "{$baseName} School",
            ]),
        ];
    }

    /**
     * Create a school if it doesn't already exist.
     */
    protected function createSchool(
        string $organizationId,
        string $schoolName,
        string $schoolNameArabic,
        string $schoolNamePashto,
        string $address = '',
        string $phone = '',
        string $email = '',
        string $website = ''
    ): void {
        $existing = SchoolBranding::where('organization_id', $organizationId)
            ->where('school_name', $schoolName)
            ->whereNull('deleted_at')
            ->first();

        if ($existing) {
            $this->command->info("School '{$schoolName}' already exists for organization.");
            return;
        }

        SchoolBranding::create([
            'organization_id' => $organizationId,
            'school_name' => $schoolName,
            'school_name_arabic' => $schoolNameArabic,
            'school_name_pashto' => $schoolNamePashto,
            'school_address' => $address,
            'school_phone' => $phone,
            'school_email' => $email,
            'school_website' => $website,
            'is_active' => true,
            'primary_color' => '#1e40af',
            'secondary_color' => '#3b82f6',
            'accent_color' => '#f59e0b',
            'font_family' => 'Bahij Nassim',
            'report_font_size' => '12px',
            'table_alternating_colors' => true,
            'show_page_numbers' => true,
            'show_generation_date' => true,
        ]);

        $this->command->info("Created school: {$schoolName}");
    }
}
