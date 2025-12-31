<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\SchoolBranding;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PlatformAdminDataSeeder extends Seeder
{
    /**
     * Seed all data for the platform admin user's organization.
     * 
     * This seeder:
     * 1. Gets the platform admin user's organization
     * 2. Ensures the organization exists (creates if needed)
     * 3. Runs all data seeders but only for this organization
     */
    public function run(): void
    {
        $this->command->info('Seeding data for platform admin user...');
        $this->command->info('');

        // Step 1: Get platform admin user's organization
        $platformAdminEmail = 'platform-admin@nazim.app';
        $platformUser = DB::table('users')
            ->where('email', $platformAdminEmail)
            ->first();

        if (!$platformUser) {
            $this->command->error("Platform admin user not found: {$platformAdminEmail}");
            $this->command->error("Please run PlatformAdminSeeder first.");
            return;
        }

        $profile = DB::table('profiles')
            ->where('id', $platformUser->id)
            ->first();

        if (!$profile || !$profile->organization_id) {
            $this->command->error("Platform admin user does not have an organization assigned.");
            $this->command->error("Please run PlatformAdminSeeder first to create organization.");
            return;
        }

        $organizationId = $profile->organization_id;
        $organization = DB::table('organizations')
            ->where('id', $organizationId)
            ->whereNull('deleted_at')
            ->first();

        if (!$organization) {
            $this->command->error("Organization not found: {$organizationId}");
            return;
        }

        $this->command->info("Platform admin organization: {$organization->name} (ID: {$organizationId})");
        $this->command->info('');

        // Step 2: Ensure organization has a school
        $school = DB::table('school_branding')
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->first();

        if (!$school) {
            $this->command->info("Creating default school for organization...");
            $school = SchoolBranding::create([
                'organization_id' => $organizationId,
                'school_name' => 'Main School',
                'is_active' => true,
                'primary_color' => '#1e40af',
                'secondary_color' => '#64748b',
                'accent_color' => '#0ea5e9',
                'font_family' => 'Inter',
                'report_font_size' => 12,
                'table_alternating_colors' => true,
                'show_page_numbers' => true,
                'show_generation_date' => true,
                'calendar_preference' => 'gregorian',
            ]);
            $this->command->info("  ✓ Created school: {$school->school_name}");
        } else {
            $this->command->info("  ✓ School exists: {$school->school_name}");
        }

        // Step 3: Run all data seeders for this organization only
        $this->command->info('');
        $this->command->info('Starting data seeding for platform admin organization...');
        $this->command->info('');

        // Seed data in the correct order (matching DatabaseSeeder)
        $seeders = [
            ['name' => 'Residency Types', 'class' => ResidencyTypeSeeder::class],
            ['name' => 'Security Levels', 'class' => SecurityLevelSeeder::class],
            ['name' => 'Document Settings', 'class' => DocumentSettingsSeeder::class],
            ['name' => 'Letter Types', 'class' => LetterTypeSeeder::class],
            ['name' => 'Library Categories', 'class' => LibraryCategorySeeder::class],
            ['name' => 'Library Books', 'class' => LibraryBookSeeder::class],
            ['name' => 'Asset Categories', 'class' => AssetCategorySeeder::class],
            ['name' => 'Assets', 'class' => AssetSeeder::class],
            ['name' => 'Grades', 'class' => GradeSeeder::class],
            ['name' => 'Buildings', 'class' => BuildingSeeder::class],
            ['name' => 'Rooms', 'class' => RoomSeeder::class],
            ['name' => 'Academic Years', 'class' => AcademicYearSeeder::class],
            ['name' => 'Exams', 'class' => ExamSeeder::class],
            ['name' => 'Schedule Slots', 'class' => ScheduleSlotSeeder::class],
            ['name' => 'Classes', 'class' => ClassSeeder::class],
            ['name' => 'Subjects', 'class' => SubjectSeeder::class],
            ['name' => 'Class Academic Year Subjects', 'class' => ClassAcademicYearSubjectSeeder::class],
            ['name' => 'Questions', 'class' => QuestionSeeder::class],
            ['name' => 'Staff Types', 'class' => StaffTypeSeeder::class],
            ['name' => 'Staff', 'class' => StaffSeeder::class],
            ['name' => 'Students', 'class' => StudentSeeder::class],
            ['name' => 'Student Admissions', 'class' => StudentAdmissionSeeder::class],
            ['name' => 'Courses', 'class' => CourseSeeder::class],
            ['name' => 'Course Students', 'class' => CourseStudentSeeder::class],
            ['name' => 'Currencies', 'class' => CurrencySeeder::class],
            ['name' => 'Income Categories', 'class' => IncomeCategorySeeder::class],
            ['name' => 'Expense Categories', 'class' => ExpenseCategorySeeder::class],
            ['name' => 'Finance Accounts', 'class' => FinanceAccountSeeder::class],
            ['name' => 'Exchange Rates', 'class' => ExchangeRateSeeder::class],
            ['name' => 'Donors', 'class' => DonorSeeder::class],
            ['name' => 'Finance Projects', 'class' => FinanceProjectSeeder::class],
            ['name' => 'Incoming Documents', 'class' => IncomingDocumentSeeder::class],
            ['name' => 'Outgoing Documents', 'class' => OutgoingDocumentSeeder::class],
            ['name' => 'Fee Structures', 'class' => FeeStructureSeeder::class],
            ['name' => 'Fee Assignments', 'class' => FeeAssignmentSeeder::class],
            ['name' => 'Exam Types', 'class' => ExamTypeSeeder::class],
        ];

        $totalSeeders = count($seeders);
        $currentSeeder = 0;

        foreach ($seeders as $seederInfo) {
            $currentSeeder++;
            $this->command->info("[{$currentSeeder}/{$totalSeeders}] Seeding {$seederInfo['name']}...");
            
            try {
                // Temporarily set organization context for seeders that need it
                // Most seeders iterate through all organizations, so we need to filter
                $this->seedForOrganization($seederInfo['class'], $organizationId);
                $this->command->info("  ✓ Completed {$seederInfo['name']}");
            } catch (\Exception $e) {
                $this->command->error("  ✗ Failed to seed {$seederInfo['name']}: " . $e->getMessage());
                $this->command->warn("  Continuing with next seeder...");
            }
            
            $this->command->info('');
        }

        $this->command->info('');
        $this->command->info('✅ Platform admin data seeding completed!');
        $this->command->info('');
        $this->command->info("All data has been seeded for organization: {$organization->name}");
    }

    /**
     * Run a seeder but filter to only work with the specified organization
     * 
     * This temporarily soft-deletes all other organizations, runs the seeder,
     * then restores them. This ensures seeders only see the target organization.
     */
    protected function seedForOrganization(string $seederClass, string $organizationId): void
    {
        // Get all other organizations (to restore later)
        $otherOrganizations = DB::table('organizations')
            ->where('id', '!=', $organizationId)
            ->whereNull('deleted_at')
            ->get(['id']);

        // Temporarily soft-delete all other organizations
        if ($otherOrganizations->isNotEmpty()) {
            $otherOrgIds = $otherOrganizations->pluck('id')->toArray();
            DB::table('organizations')
                ->whereIn('id', $otherOrgIds)
                ->update(['deleted_at' => now()]);
        }

        try {
            // Create seeder instance and run it
            $seeder = new $seederClass();
            $seeder->setCommand($this->command);
            $seeder->run();
        } finally {
            // Always restore other organizations, even if seeder fails
            if ($otherOrganizations->isNotEmpty()) {
                $otherOrgIds = $otherOrganizations->pluck('id')->toArray();
                DB::table('organizations')
                    ->whereIn('id', $otherOrgIds)
                    ->update(['deleted_at' => null]);
            }
        }
    }
}

