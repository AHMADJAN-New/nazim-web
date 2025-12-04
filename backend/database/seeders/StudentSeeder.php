<?php

namespace Database\Seeders;

use App\Models\Student;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StudentSeeder extends Seeder
{
    /**
     * Seed the students table.
     *
     * Creates 5 students for each organization with Pashto names and complete data.
     */
    public function run(): void
    {
        $this->command->info('Seeding students...');

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
            $this->command->info("Creating students for {$organization->name}...");

            // Get schools for this organization
            $schools = DB::table('school_branding')
                ->where('organization_id', $organization->id)
                ->whereNull('deleted_at')
                ->get();

            $created = $this->createStudentsForOrganization(
                $organization->id,
                $schools
            );
            $totalCreated += $created;

            $this->command->info("  → Created {$created} student(s) for {$organization->name}");
        }

        $this->command->info("✅ Student seeding completed. Total created: {$totalCreated}");
    }

    /**
     * Create students for an organization
     */
    protected function createStudentsForOrganization(
        string $organizationId,
        $schools
    ): int {
        $created = 0;

        // Define 5 students with Pashto names and complete data
        $students = [
            [
                'admission_no' => 'STU001',
                'full_name' => 'احمد محمد',
                'father_name' => 'محمد',
                'grandfather_name' => 'عبدالله',
                'mother_name' => 'فاطمه',
                'gender' => 'male',
                'birth_year' => '2010',
                'birth_date' => '2010-03-15',
                'age' => 14,
                'admission_year' => '2024',
                'orig_province' => 'کابل',
                'orig_district' => 'کابل',
                'orig_village' => 'دشت برچی',
                'curr_province' => 'کابل',
                'curr_district' => 'کابل',
                'curr_village' => 'دشت برچی',
                'nationality' => 'افغان',
                'preferred_language' => 'پښتو',
                'previous_school' => null,
                'guardian_name' => 'محمد عبدالله',
                'guardian_relation' => 'پلار',
                'guardian_phone' => '+93 700 123 456',
                'guardian_tazkira' => '1400123456789',
                'home_address' => 'کابل، دشت برچی، افغانستان',
                'zamin_name' => 'عبدالرحمن محمد',
                'zamin_phone' => '+93 700 234 567',
                'zamin_tazkira' => '1400123456790',
                'zamin_address' => 'کابل، افغانستان',
                'applying_grade' => 'دهم',
                'is_orphan' => false,
                'admission_fee_status' => 'paid',
                'student_status' => 'active',
                'disability_status' => null,
                'emergency_contact_name' => 'حبیب الله',
                'emergency_contact_phone' => '+93 700 345 678',
                'family_income' => '25000',
            ],
            [
                'admission_no' => 'STU002',
                'full_name' => 'عبدالرحمن حبیب الله',
                'father_name' => 'حبیب الله',
                'grandfather_name' => 'محمد',
                'mother_name' => 'زینب',
                'gender' => 'male',
                'birth_year' => '2011',
                'birth_date' => '2011-05-20',
                'age' => 13,
                'admission_year' => '2024',
                'orig_province' => 'کندهار',
                'orig_district' => 'کندهار',
                'orig_village' => 'مرکز',
                'curr_province' => 'کابل',
                'curr_district' => 'کابل',
                'curr_village' => 'کارته پروان',
                'nationality' => 'افغان',
                'preferred_language' => 'پښتو',
                'previous_school' => null,
                'guardian_name' => 'حبیب الله محمد',
                'guardian_relation' => 'پلار',
                'guardian_phone' => '+93 700 456 789',
                'guardian_tazkira' => '1400123456791',
                'home_address' => 'کابل، کارته پروان، افغانستان',
                'zamin_name' => 'محمد ابراهیم',
                'zamin_phone' => '+93 700 567 890',
                'zamin_tazkira' => '1400123456792',
                'zamin_address' => 'کابل، افغانستان',
                'applying_grade' => 'نهم',
                'is_orphan' => false,
                'admission_fee_status' => 'paid',
                'student_status' => 'active',
                'disability_status' => null,
                'emergency_contact_name' => 'عبدالواحد',
                'emergency_contact_phone' => '+93 700 678 901',
                'family_income' => '30000',
            ],
            [
                'admission_no' => 'STU003',
                'full_name' => 'فاطمه علی',
                'father_name' => 'علی',
                'grandfather_name' => 'محمد',
                'mother_name' => 'مریم',
                'gender' => 'female',
                'birth_year' => '2012',
                'birth_date' => '2012-08-10',
                'age' => 12,
                'admission_year' => '2024',
                'orig_province' => 'هرات',
                'orig_district' => 'هرات',
                'orig_village' => 'انجیل',
                'curr_province' => 'کابل',
                'curr_district' => 'کابل',
                'curr_village' => 'پغمان',
                'nationality' => 'افغان',
                'preferred_language' => 'پښتو',
                'previous_school' => null,
                'guardian_name' => 'علی محمد',
                'guardian_relation' => 'پلار',
                'guardian_phone' => '+93 700 789 012',
                'guardian_tazkira' => '1400123456793',
                'home_address' => 'کابل، پغمان، افغانستان',
                'zamin_name' => 'حسین علی',
                'zamin_phone' => '+93 700 890 123',
                'zamin_tazkira' => '1400123456794',
                'zamin_address' => 'کابل، افغانستان',
                'applying_grade' => 'اتم',
                'is_orphan' => false,
                'admission_fee_status' => 'pending',
                'student_status' => 'active',
                'disability_status' => null,
                'emergency_contact_name' => 'احمد',
                'emergency_contact_phone' => '+93 700 901 234',
                'family_income' => '20000',
            ],
            [
                'admission_no' => 'STU004',
                'full_name' => 'محمد ابراهیم',
                'father_name' => 'ابراهیم',
                'grandfather_name' => 'عبدالواحد',
                'mother_name' => 'خدیجه',
                'gender' => 'male',
                'birth_year' => '2009',
                'birth_date' => '2009-11-25',
                'age' => 15,
                'admission_year' => '2024',
                'orig_province' => 'بلخ',
                'orig_district' => 'مزار شریف',
                'orig_village' => 'مرکز',
                'curr_province' => 'کابل',
                'curr_district' => 'کابل',
                'curr_village' => 'دشت برچی',
                'nationality' => 'افغان',
                'preferred_language' => 'پښتو',
                'previous_school' => 'لیسه عالی مزار شریف',
                'guardian_name' => 'ابراهیم عبدالواحد',
                'guardian_relation' => 'پلار',
                'guardian_phone' => '+93 700 012 345',
                'guardian_tazkira' => '1400123456795',
                'home_address' => 'کابل، دشت برچی، افغانستان',
                'zamin_name' => 'عبدالغفار محمد',
                'zamin_phone' => '+93 700 123 456',
                'zamin_tazkira' => '1400123456796',
                'zamin_address' => 'کابل، افغانستان',
                'applying_grade' => 'یازدهم',
                'is_orphan' => false,
                'admission_fee_status' => 'paid',
                'student_status' => 'active',
                'disability_status' => null,
                'emergency_contact_name' => 'محمد نبی',
                'emergency_contact_phone' => '+93 700 234 567',
                'family_income' => '35000',
            ],
            [
                'admission_no' => 'STU005',
                'full_name' => 'زینب احمد',
                'father_name' => 'احمد',
                'grandfather_name' => 'عبدالرحمن',
                'mother_name' => 'عایشه',
                'gender' => 'female',
                'birth_year' => '2013',
                'birth_date' => '2013-02-14',
                'age' => 11,
                'admission_year' => '2024',
                'orig_province' => 'ننگرهار',
                'orig_district' => 'جلال آباد',
                'orig_village' => 'مرکز',
                'curr_province' => 'کابل',
                'curr_district' => 'کابل',
                'curr_village' => 'کارته پروان',
                'nationality' => 'افغان',
                'preferred_language' => 'پښتو',
                'previous_school' => null,
                'guardian_name' => 'احمد عبدالرحمن',
                'guardian_relation' => 'پلار',
                'guardian_phone' => '+93 700 345 678',
                'guardian_tazkira' => '1400123456797',
                'home_address' => 'کابل، کارته پروان، افغانستان',
                'zamin_name' => 'حبیب الله',
                'zamin_phone' => '+93 700 456 789',
                'zamin_tazkira' => '1400123456798',
                'zamin_address' => 'کابل، افغانستان',
                'applying_grade' => 'شپږم',
                'is_orphan' => false,
                'admission_fee_status' => 'paid',
                'student_status' => 'active',
                'disability_status' => null,
                'emergency_contact_name' => 'عبدالله',
                'emergency_contact_phone' => '+93 700 567 890',
                'family_income' => '22000',
            ],
        ];

        foreach ($students as $studentData) {
            // Check if student already exists
            $exists = DB::table('students')
                ->where('admission_no', $studentData['admission_no'])
                ->where('organization_id', $organizationId)
                ->whereNull('deleted_at')
                ->exists();

            if ($exists) {
                $this->command->info("  ⚠ Student {$studentData['admission_no']} already exists. Skipping.");
                continue;
            }

            // Get a school (if available)
            $schoolId = $schools->isNotEmpty() ? $schools->random()->id : null;

            // Create student
            $studentId = (string) Str::uuid();
            
            DB::table('students')->insert([
                'id' => $studentId,
                'organization_id' => $organizationId,
                'school_id' => $schoolId,
                'card_number' => null,
                'admission_no' => $studentData['admission_no'],
                'full_name' => $studentData['full_name'],
                'father_name' => $studentData['father_name'],
                'grandfather_name' => $studentData['grandfather_name'],
                'mother_name' => $studentData['mother_name'],
                'gender' => $studentData['gender'],
                'birth_year' => $studentData['birth_year'],
                'birth_date' => $studentData['birth_date'],
                'age' => $studentData['age'],
                'admission_year' => $studentData['admission_year'],
                'orig_province' => $studentData['orig_province'],
                'orig_district' => $studentData['orig_district'],
                'orig_village' => $studentData['orig_village'],
                'curr_province' => $studentData['curr_province'],
                'curr_district' => $studentData['curr_district'],
                'curr_village' => $studentData['curr_village'],
                'nationality' => $studentData['nationality'],
                'preferred_language' => $studentData['preferred_language'],
                'previous_school' => $studentData['previous_school'],
                'guardian_name' => $studentData['guardian_name'],
                'guardian_relation' => $studentData['guardian_relation'],
                'guardian_phone' => $studentData['guardian_phone'],
                'guardian_tazkira' => $studentData['guardian_tazkira'],
                'guardian_picture_path' => null,
                'home_address' => $studentData['home_address'],
                'zamin_name' => $studentData['zamin_name'],
                'zamin_phone' => $studentData['zamin_phone'],
                'zamin_tazkira' => $studentData['zamin_tazkira'],
                'zamin_address' => $studentData['zamin_address'],
                'applying_grade' => $studentData['applying_grade'],
                'is_orphan' => $studentData['is_orphan'],
                'admission_fee_status' => $studentData['admission_fee_status'],
                'student_status' => $studentData['student_status'],
                'disability_status' => $studentData['disability_status'],
                'emergency_contact_name' => $studentData['emergency_contact_name'],
                'emergency_contact_phone' => $studentData['emergency_contact_phone'],
                'family_income' => $studentData['family_income'],
                'picture_path' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $created++;
            $this->command->info("  ✓ Created student: {$studentData['full_name']} ({$studentData['admission_no']})");
        }

        return $created;
    }
}
