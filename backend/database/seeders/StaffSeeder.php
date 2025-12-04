<?php

namespace Database\Seeders;

use App\Models\Staff;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StaffSeeder extends Seeder
{
    /**
     * Seed the staff table.
     *
     * Creates 5 staff members for each organization with Pashto names and complete data.
     */
    public function run(): void
    {
        $this->command->info('Seeding staff members...');

        // Get all organizations
        $organizations = DB::table('organizations')
            ->whereNull('deleted_at')
            ->get();

        if ($organizations->isEmpty()) {
            $this->command->warn('No organizations found. Please run DatabaseSeeder first.');
            return;
        }

        $totalCreated = 0;

        foreach ($organizations as $organization) {
            $this->command->info("Creating staff members for {$organization->name}...");

            // Get staff types for this organization (or global ones)
            $staffTypes = DB::table('staff_types')
                ->where(function ($query) use ($organization) {
                    $query->whereNull('organization_id')
                        ->orWhere('organization_id', $organization->id);
                })
                ->whereNull('deleted_at')
                ->where('is_active', true)
                ->get();

            if ($staffTypes->isEmpty()) {
                $this->command->warn("  ⚠ No staff types found for {$organization->name}. Skipping staff creation.");
                continue;
            }

            // Get schools for this organization
            $schools = DB::table('school_branding')
                ->where('organization_id', $organization->id)
                ->whereNull('deleted_at')
                ->get();

            // Get admin profile for created_by field
            $adminProfile = DB::table('profiles')
                ->where('organization_id', $organization->id)
                ->where('role', 'admin')
                ->first();

            $created = $this->createStaffForOrganization(
                $organization->id,
                $staffTypes,
                $schools,
                $adminProfile?->id
            );
            $totalCreated += $created;

            $this->command->info("  → Created {$created} staff member(s) for {$organization->name}");
        }

        $this->command->info("✅ Staff seeding completed. Total created: {$totalCreated}");
    }

    /**
     * Create staff members for an organization
     */
    protected function createStaffForOrganization(
        string $organizationId,
        $staffTypes,
        $schools,
        ?string $createdBy
    ): int {
        $created = 0;

        // Define 5 staff members with Pashto names and complete data
        $staffMembers = [
            [
                'employee_id' => 'EMP001',
                'first_name' => 'احمد',
                'father_name' => 'محمد',
                'grandfather_name' => 'عبدالله',
                'tazkira_number' => '1400123456789',
                'birth_year' => '1990',
                'birth_date' => '1990-05-15',
                'phone_number' => '+93 700 123 456',
                'email' => 'ahmad.mohammad@example.com',
                'home_address' => 'کابل، افغانستان',
                'origin_province' => 'کابل',
                'origin_district' => 'کابل',
                'origin_village' => 'دشت برچی',
                'current_province' => 'کابل',
                'current_district' => 'کابل',
                'current_village' => 'دشت برچی',
                'religious_education' => 'حوزوی',
                'religious_university' => 'جامعه المصطفی',
                'religious_graduation_year' => '2015',
                'religious_department' => 'فقه و اصول',
                'modern_education' => 'لیسانس',
                'modern_school_university' => 'پوهنتون کابل',
                'modern_graduation_year' => '2012',
                'modern_department' => 'علوم اسلامی',
                'teaching_section' => 'فقه',
                'position' => 'استاد',
                'duty' => 'تدریس',
                'salary' => '25000',
                'status' => 'active',
                'staff_type_code' => 'teacher',
            ],
            [
                'employee_id' => 'EMP002',
                'first_name' => 'عبدالرحمن',
                'father_name' => 'حبیب الله',
                'grandfather_name' => 'محمد',
                'tazkira_number' => '1400123456790',
                'birth_year' => '1985',
                'birth_date' => '1985-08-20',
                'phone_number' => '+93 700 234 567',
                'email' => 'abdulrahman.habib@example.com',
                'home_address' => 'کندهار، افغانستان',
                'origin_province' => 'کندهار',
                'origin_district' => 'کندهار',
                'origin_village' => 'مرکز',
                'current_province' => 'کابل',
                'current_district' => 'کابل',
                'current_village' => 'کارته پروان',
                'religious_education' => 'حوزوی',
                'religious_university' => 'حوزه علمیه قم',
                'religious_graduation_year' => '2010',
                'religious_department' => 'تفسیر',
                'modern_education' => 'ماستری',
                'modern_school_university' => 'پوهنتون کابل',
                'modern_graduation_year' => '2008',
                'modern_department' => 'ادبیات',
                'teaching_section' => 'عربی',
                'position' => 'معاون',
                'duty' => 'اداره',
                'salary' => '30000',
                'status' => 'active',
                'staff_type_code' => 'admin',
            ],
            [
                'employee_id' => 'EMP003',
                'first_name' => 'محمد ابراهیم',
                'father_name' => 'عبدالواحد',
                'grandfather_name' => 'احمد',
                'tazkira_number' => '1400123456791',
                'birth_year' => '1992',
                'birth_date' => '1992-03-10',
                'phone_number' => '+93 700 345 678',
                'email' => 'mohammad.ibrahim@example.com',
                'home_address' => 'هرات، افغانستان',
                'origin_province' => 'هرات',
                'origin_district' => 'هرات',
                'origin_village' => 'انجیل',
                'current_province' => 'کابل',
                'current_district' => 'کابل',
                'current_village' => 'پغمان',
                'religious_education' => 'حوزوی',
                'religious_university' => 'حوزه علمیه مشهد',
                'religious_graduation_year' => '2018',
                'religious_department' => 'حدیث',
                'modern_education' => 'لیسانس',
                'modern_school_university' => 'پوهنتون هرات',
                'modern_graduation_year' => '2015',
                'modern_department' => 'اقتصاد',
                'teaching_section' => 'ریاضیات',
                'position' => 'استاد',
                'duty' => 'تدریس',
                'salary' => '22000',
                'status' => 'active',
                'staff_type_code' => 'teacher',
            ],
            [
                'employee_id' => 'EMP004',
                'first_name' => 'حسین',
                'father_name' => 'علی',
                'grandfather_name' => 'محمد',
                'tazkira_number' => '1400123456792',
                'birth_year' => '1988',
                'birth_date' => '1988-11-25',
                'phone_number' => '+93 700 456 789',
                'email' => 'hussain.ali@example.com',
                'home_address' => 'مزار شریف، افغانستان',
                'origin_province' => 'بلخ',
                'origin_district' => 'مزار شریف',
                'origin_village' => 'مرکز',
                'current_province' => 'کابل',
                'current_district' => 'کابل',
                'current_village' => 'دشت برچی',
                'religious_education' => 'حوزوی',
                'religious_university' => 'حوزه علمیه نجف',
                'religious_graduation_year' => '2012',
                'religious_department' => 'کلام',
                'modern_education' => 'لیسانس',
                'modern_school_university' => 'پوهنتون بلخ',
                'modern_graduation_year' => '2010',
                'modern_department' => 'حسابداری',
                'teaching_section' => null,
                'position' => 'محاسب',
                'duty' => 'مالی',
                'salary' => '28000',
                'status' => 'active',
                'staff_type_code' => 'accountant',
            ],
            [
                'employee_id' => 'EMP005',
                'first_name' => 'عبدالغفار',
                'father_name' => 'محمد نبی',
                'grandfather_name' => 'عبدالرحمن',
                'tazkira_number' => '1400123456793',
                'birth_year' => '1995',
                'birth_date' => '1995-07-05',
                'phone_number' => '+93 700 567 890',
                'email' => 'abdulghaffar.mohammad@example.com',
                'home_address' => 'جلال آباد، افغانستان',
                'origin_province' => 'ننگرهار',
                'origin_district' => 'جلال آباد',
                'origin_village' => 'مرکز',
                'current_province' => 'کابل',
                'current_district' => 'کابل',
                'current_village' => 'کارته پروان',
                'religious_education' => 'حوزوی',
                'religious_university' => 'حوزه علمیه قم',
                'religious_graduation_year' => '2020',
                'religious_department' => 'عقاید',
                'modern_education' => 'لیسانس',
                'modern_school_university' => 'پوهنتون ننگرهار',
                'modern_graduation_year' => '2018',
                'modern_department' => 'کتابداری',
                'teaching_section' => null,
                'position' => 'کتابدار',
                'duty' => 'کتابخانه',
                'salary' => '20000',
                'status' => 'active',
                'staff_type_code' => 'librarian',
            ],
        ];

        foreach ($staffMembers as $staffData) {
            // Check if staff member already exists
            $exists = DB::table('staff')
                ->where('employee_id', $staffData['employee_id'])
                ->where('organization_id', $organizationId)
                ->whereNull('deleted_at')
                ->exists();

            if ($exists) {
                $this->command->info("  ⚠ Staff member {$staffData['employee_id']} already exists. Skipping.");
                continue;
            }

            // Find staff type by code
            $staffType = $staffTypes->firstWhere('code', $staffData['staff_type_code']);
            if (!$staffType) {
                // Fallback to first available staff type
                $staffType = $staffTypes->first();
            }

            // Get a school (if available)
            $schoolId = $schools->isNotEmpty() ? $schools->random()->id : null;

            // Create staff member
            $staffId = (string) Str::uuid();
            
            DB::table('staff')->insert([
                'id' => $staffId,
                'profile_id' => null, // Can be linked later if needed
                'organization_id' => $organizationId,
                'employee_id' => $staffData['employee_id'],
                'staff_type' => $staffData['staff_type_code'],
                'staff_type_id' => $staffType->id,
                'school_id' => $schoolId,
                'first_name' => $staffData['first_name'],
                'father_name' => $staffData['father_name'],
                'grandfather_name' => $staffData['grandfather_name'],
                'tazkira_number' => $staffData['tazkira_number'],
                'birth_year' => $staffData['birth_year'],
                'birth_date' => $staffData['birth_date'],
                'phone_number' => $staffData['phone_number'],
                'email' => $staffData['email'],
                'home_address' => $staffData['home_address'],
                'origin_province' => $staffData['origin_province'],
                'origin_district' => $staffData['origin_district'],
                'origin_village' => $staffData['origin_village'],
                'current_province' => $staffData['current_province'],
                'current_district' => $staffData['current_district'],
                'current_village' => $staffData['current_village'],
                'religious_education' => $staffData['religious_education'],
                'religious_university' => $staffData['religious_university'],
                'religious_graduation_year' => $staffData['religious_graduation_year'],
                'religious_department' => $staffData['religious_department'],
                'modern_education' => $staffData['modern_education'],
                'modern_school_university' => $staffData['modern_school_university'],
                'modern_graduation_year' => $staffData['modern_graduation_year'],
                'modern_department' => $staffData['modern_department'],
                'teaching_section' => $staffData['teaching_section'],
                'position' => $staffData['position'],
                'duty' => $staffData['duty'],
                'salary' => $staffData['salary'],
                'status' => $staffData['status'],
                'picture_url' => null,
                'document_urls' => json_encode([]),
                'notes' => 'Created by StaffSeeder',
                'created_by' => $createdBy,
                'updated_by' => $createdBy,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $created++;
            $this->command->info("  ✓ Created staff: {$staffData['first_name']} {$staffData['father_name']} ({$staffData['employee_id']})");
        }

        return $created;
    }
}
