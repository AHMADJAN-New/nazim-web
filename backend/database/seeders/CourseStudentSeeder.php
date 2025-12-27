<?php

namespace Database\Seeders;

use App\Models\CourseStudent;
use App\Models\ShortTermCourse;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CourseStudentSeeder extends Seeder
{
    /**
     * Seed the course_students table.
     *
     * Enrolls 4 students in each of the 3 courses for each organization.
     * All data is in Arabic.
     */
    public function run(): void
    {
        $this->command->info('Seeding course students...');

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
            $this->command->info("Enrolling students in courses for {$organization->name}...");

            // Get all schools for this organization
            $schools = DB::table('school_branding')
                ->where('organization_id', $organization->id)
                ->whereNull('deleted_at')
                ->get();

            if ($schools->isEmpty()) {
                $this->command->warn("  ⚠ No schools found for organization {$organization->name}. Skipping course student seeding for this org.");
                continue;
            }

            foreach ($schools as $school) {
                $this->command->info("Enrolling students in courses for {$organization->name} - school: {$school->school_name}...");

                // Get all courses for this school
                $courses = ShortTermCourse::where('organization_id', $organization->id)
                    ->where('school_id', $school->id)
                    ->whereNull('deleted_at')
                    ->get();

                if ($courses->isEmpty()) {
                    $this->command->warn("  ⚠ No courses found for {$organization->name} - {$school->school_name}. Please run CourseSeeder first.");
                    continue;
                }

                foreach ($courses as $course) {
                    $created = $this->enrollStudentsInCourse($organization->id, $school->id, $course);
                    $totalCreated += $created;
                    if ($created > 0) {
                        $this->command->info("  → Enrolled {$created} student(s) in '{$course->name_ar}'");
                    }
                }
            }
        }

        if ($totalCreated > 0) {
            $this->command->info("  → Total: Enrolled {$totalCreated} student(s)");
        }

        $this->command->info('✅ Course students seeded successfully!');
    }

    /**
     * Enroll 4 students in a course
     */
    protected function enrollStudentsInCourse(string $organizationId, string $schoolId, ShortTermCourse $course): int
    {
        $createdCount = 0;

        // Define 4 students with Arabic data
        $students = [
            [
                'full_name' => 'أحمد محمد علي',
                'father_name' => 'محمد علي',
                'grandfather_name' => 'علي حسن',
                'mother_name' => 'فاطمة أحمد',
                'gender' => 'ذكر',
                'birth_year' => 2010,
                'age' => 14,
                'orig_province' => 'كابل',
                'orig_district' => 'منطقة 1',
                'orig_village' => 'قرية السلام',
                'curr_province' => 'كابل',
                'curr_district' => 'منطقة 1',
                'curr_village' => 'قرية السلام',
                'nationality' => 'أفغاني',
                'preferred_language' => 'عربي',
                'guardian_name' => 'محمد علي',
                'guardian_relation' => 'والد',
                'guardian_phone' => '0700123456',
                'home_address' => 'كابل، منطقة 1، قرية السلام',
            ],
            [
                'full_name' => 'فاطمة أحمد حسن',
                'father_name' => 'أحمد حسن',
                'grandfather_name' => 'حسن إبراهيم',
                'mother_name' => 'مريم علي',
                'gender' => 'أنثى',
                'birth_year' => 2011,
                'age' => 13,
                'orig_province' => 'هرات',
                'orig_district' => 'منطقة 2',
                'orig_village' => 'قرية النور',
                'curr_province' => 'هرات',
                'curr_district' => 'منطقة 2',
                'curr_village' => 'قرية النور',
                'nationality' => 'أفغاني',
                'preferred_language' => 'عربي',
                'guardian_name' => 'أحمد حسن',
                'guardian_relation' => 'والد',
                'guardian_phone' => '0700123457',
                'home_address' => 'هرات، منطقة 2، قرية النور',
            ],
            [
                'full_name' => 'علي إبراهيم محمد',
                'father_name' => 'إبراهيم محمد',
                'grandfather_name' => 'محمد علي',
                'mother_name' => 'خديجة أحمد',
                'gender' => 'ذكر',
                'birth_year' => 2009,
                'age' => 15,
                'orig_province' => 'قندهار',
                'orig_district' => 'منطقة 3',
                'orig_village' => 'قرية الإيمان',
                'curr_province' => 'قندهار',
                'curr_district' => 'منطقة 3',
                'curr_village' => 'قرية الإيمان',
                'nationality' => 'أفغاني',
                'preferred_language' => 'عربي',
                'guardian_name' => 'إبراهيم محمد',
                'guardian_relation' => 'والد',
                'guardian_phone' => '0700123458',
                'home_address' => 'قندهار، منطقة 3، قرية الإيمان',
            ],
            [
                'full_name' => 'مريم حسن علي',
                'father_name' => 'حسن علي',
                'grandfather_name' => 'علي إبراهيم',
                'mother_name' => 'عائشة محمد',
                'gender' => 'أنثى',
                'birth_year' => 2012,
                'age' => 12,
                'orig_province' => 'مزار شريف',
                'orig_district' => 'منطقة 4',
                'orig_village' => 'قرية الخير',
                'curr_province' => 'مزار شريف',
                'curr_district' => 'منطقة 4',
                'curr_village' => 'قرية الخير',
                'nationality' => 'أفغاني',
                'preferred_language' => 'عربي',
                'guardian_name' => 'حسن علي',
                'guardian_relation' => 'والد',
                'guardian_phone' => '0700123459',
                'home_address' => 'مزار شريف، منطقة 4، قرية الخير',
            ],
        ];

        foreach ($students as $studentData) {
            $created = $this->createCourseStudent($organizationId, $schoolId, $course, $studentData);

            if ($created) {
                $createdCount++;
            }
        }

        return $createdCount;
    }

    /**
     * Create a course student if it doesn't already exist
     */
    protected function createCourseStudent(string $organizationId, string $schoolId, ShortTermCourse $course, array $studentData): bool
    {
        // Generate admission number similar to controller: CS-COURSE_CODE-YEAR-SEQUENCE
        // Get count of existing students for this course to generate sequence
        $sequence = CourseStudent::where('course_id', $course->id)
            ->whereNull('deleted_at')
            ->count() + 1;
        
        $year = $course->start_date ? $course->start_date->format('Y') : now()->format('Y');
        
        // Extract course code from name (first 3 letters, uppercase, alphanumeric only)
        $courseCode = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $course->name_en), 0, 3));
        if (strlen($courseCode) < 3) {
            $courseCode = 'CRS'; // Fallback
        }
        
        $admissionNo = sprintf('CS-%s-%s-%03d', $courseCode, $year, $sequence);

        // Check if course student already exists with this admission_no, organization_id, and school_id
        $existing = CourseStudent::where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->where('admission_no', $admissionNo)
            ->whereNull('deleted_at')
            ->first();

        if ($existing) {
            return false; // Skip if already exists
        }

        // Registration date: within the last 30 days
        $registrationDate = now()->subDays(rand(0, 30));

        CourseStudent::create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'course_id' => $course->id,
            'admission_no' => $admissionNo,
            'registration_date' => $registrationDate,
            'completion_status' => 'enrolled',
            'fee_paid' => rand(0, 1) === 1, // Random: some paid, some not
            'fee_amount' => $course->fee_amount,
            'fee_paid_date' => rand(0, 1) === 1 ? $registrationDate->copy()->addDays(rand(1, 5)) : null,
            'full_name' => $studentData['full_name'],
            'father_name' => $studentData['father_name'],
            'grandfather_name' => $studentData['grandfather_name'],
            'mother_name' => $studentData['mother_name'],
            'gender' => $studentData['gender'],
            'birth_year' => $studentData['birth_year'],
            'age' => $studentData['age'],
            'orig_province' => $studentData['orig_province'],
            'orig_district' => $studentData['orig_district'],
            'orig_village' => $studentData['orig_village'],
            'curr_province' => $studentData['curr_province'],
            'curr_district' => $studentData['curr_district'],
            'curr_village' => $studentData['curr_village'],
            'nationality' => $studentData['nationality'],
            'preferred_language' => $studentData['preferred_language'],
            'guardian_name' => $studentData['guardian_name'],
            'guardian_relation' => $studentData['guardian_relation'],
            'guardian_phone' => $studentData['guardian_phone'],
            'home_address' => $studentData['home_address'],
            'is_orphan' => false,
        ]);

        return true;
    }
}
