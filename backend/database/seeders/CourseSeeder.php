<?php

namespace Database\Seeders;

use App\Models\ShortTermCourse;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CourseSeeder extends Seeder
{
    /**
     * Seed the short_term_courses table.
     *
     * Creates 3 Islamic courses in Arabic for each organization:
     * - دورة حفظ القرآن الكريم (Quran Memorization Course)
     * - دورة تعلم اللغة العربية (Arabic Language Learning Course)
     * - دورة الفقه الإسلامي (Islamic Jurisprudence Course)
     */
    public function run(): void
    {
        $this->command->info('Seeding short-term courses...');

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
            $this->command->info("Creating courses for {$organization->name}...");

            // Create courses for this organization
            $created = $this->createCoursesForOrganization($organization->id);
            $totalCreated += $created;

            $this->command->info("  → Created {$created} course(s) for {$organization->name}");
        }

        if ($totalCreated > 0) {
            $this->command->info("  → Total: Created {$totalCreated} course(s)");
        }

        $this->command->info('✅ Short-term courses seeded successfully!');
    }

    /**
     * Create courses for a specific organization
     */
    protected function createCoursesForOrganization(string $organizationId): int
    {
        $createdCount = 0;

        // Define the courses to create (in Arabic)
        $courses = [
            [
                'name' => 'دورة حفظ القرآن الكريم',
                'name_ar' => 'دورة حفظ القرآن الكريم',
                'name_en' => 'Quran Memorization Course',
                'description' => 'دورة مكثفة لحفظ القرآن الكريم مع التلاوة الصحيحة والتجويد',
                'duration_days' => 90,
                'max_students' => 30,
                'fee_amount' => 500.00,
                'instructor_name' => 'الشيخ محمد أحمد',
                'location' => 'المسجد الرئيسي',
            ],
            [
                'name' => 'دورة تعلم اللغة العربية',
                'name_ar' => 'دورة تعلم اللغة العربية',
                'name_en' => 'Arabic Language Learning Course',
                'description' => 'دورة شاملة لتعلم اللغة العربية من الأساسيات إلى المستوى المتقدم',
                'duration_days' => 60,
                'max_students' => 25,
                'fee_amount' => 400.00,
                'instructor_name' => 'الأستاذ علي حسن',
                'location' => 'قاعة المحاضرات',
            ],
            [
                'name' => 'دورة الفقه الإسلامي',
                'name_ar' => 'دورة الفقه الإسلامي',
                'name_en' => 'Islamic Jurisprudence Course',
                'description' => 'دراسة الفقه الإسلامي والأحكام الشرعية في العبادات والمعاملات',
                'duration_days' => 45,
                'max_students' => 20,
                'fee_amount' => 350.00,
                'instructor_name' => 'الشيخ عبدالله إبراهيم',
                'location' => 'المكتبة الإسلامية',
            ],
        ];

        foreach ($courses as $courseData) {
            $created = $this->createCourse($organizationId, $courseData);

            if ($created) {
                $createdCount++;
            }
        }

        return $createdCount;
    }

    /**
     * Create a course if it doesn't already exist
     */
    protected function createCourse(string $organizationId, array $courseData): bool
    {
        // Check if course already exists for this organization (by name_ar)
        $existing = ShortTermCourse::where('organization_id', $organizationId)
            ->where('name_ar', $courseData['name_ar'])
            ->whereNull('deleted_at')
            ->first();

        if ($existing) {
            $this->command->info("  ✓ Course '{$courseData['name_ar']}' already exists for organization.");
            return false;
        }

        // Calculate start and end dates
        $startDate = now()->addDays(7); // Start 7 days from now
        $endDate = $startDate->copy()->addDays($courseData['duration_days']);

        ShortTermCourse::create([
            'id' => (string) Str::uuid(), // Explicitly set UUID
            'organization_id' => $organizationId,
            'name' => $courseData['name'],
            'name_ar' => $courseData['name_ar'],
            'name_en' => $courseData['name_en'],
            'description' => $courseData['description'],
            'start_date' => $startDate,
            'end_date' => $endDate,
            'duration_days' => $courseData['duration_days'],
            'max_students' => $courseData['max_students'],
            'status' => 'open',
            'fee_amount' => $courseData['fee_amount'],
            'instructor_name' => $courseData['instructor_name'],
            'location' => $courseData['location'],
        ]);

        $this->command->info("  ✓ Created course: {$courseData['name_ar']}");

        return true;
    }
}

