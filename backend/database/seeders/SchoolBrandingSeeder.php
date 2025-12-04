<?php

namespace Database\Seeders;

use App\Models\SchoolBranding;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SchoolBrandingSeeder extends Seeder
{
    /**
     * Seed the school branding table.
     *
     * Creates:
     * - Organization One: 1 school (جامعه شمس العلوم کابل)
     * - Organization Two: 2 schools (جامعه دار العلوم کابل, جامعه منبع العلوم کابل)
     */
    public function run(): void
    {
        $this->command->info('Seeding schools...');

        // Get organizations
        $org1 = DB::table('organizations')
            ->where('slug', 'org-one')
            ->whereNull('deleted_at')
            ->first();

        $org2 = DB::table('organizations')
            ->where('slug', 'org-two')
            ->whereNull('deleted_at')
            ->first();

        if (!$org1) {
            $this->command->warn('Organization One not found. Please run DatabaseSeeder first.');
            return;
        }

        if (!$org2) {
            $this->command->warn('Organization Two not found. Please run DatabaseSeeder first.');
            return;
        }

        // Organization One: 1 school
        $this->createSchool(
            $org1->id,
            'جامعه شمس العلوم کابل',
            'جامعه شمس العلوم کابل',
            'جامعه شمس العلوم کابل',
            'Kabul, Afghanistan',
            '+93-20-123-4567',
            'shams@example.com',
            'https://shams.example.com'
        );

        // Organization Two: 2 schools
        $this->createSchool(
            $org2->id,
            'جامعه دار العلوم کابل',
            'جامعه دار العلوم کابل',
            'جامعه دار العلوم کابل',
            'Kabul, Afghanistan',
            '+93-20-234-5678',
            'dar@example.com',
            'https://dar.example.com'
        );

        $this->createSchool(
            $org2->id,
            'جامعه منبع العلوم کابل',
            'جامعه منبع العلوم کابل',
            'جامعه منبع العلوم کابل',
            'Kabul, Afghanistan',
            '+93-20-345-6789',
            'manba@example.com',
            'https://manba.example.com'
        );

        $this->command->info('✅ Schools seeded successfully!');
        $this->command->info('  - Organization One: 1 school');
        $this->command->info('  - Organization Two: 2 schools');
    }

    /**
     * Create a school if it doesn't already exist
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
        // Check if school already exists for this organization
        $existing = SchoolBranding::where('organization_id', $organizationId)
            ->where('school_name', $schoolName)
            ->whereNull('deleted_at')
            ->first();

        if ($existing) {
            $this->command->info("  ✓ School '{$schoolName}' already exists for organization.");
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
            'primary_color' => '#1e40af', // Default blue
            'secondary_color' => '#3b82f6', // Default light blue
            'accent_color' => '#f59e0b', // Default amber
            'font_family' => 'Arial',
            'report_font_size' => 12,
            'table_alternating_colors' => true,
            'show_page_numbers' => true,
            'show_generation_date' => true,
        ]);

        $this->command->info("  ✓ Created school: {$schoolName}");
    }
}

