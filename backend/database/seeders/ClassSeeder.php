<?php

namespace Database\Seeders;

use App\Models\ClassModel;
use App\Models\ClassAcademicYear;
use App\Models\AcademicYear;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ClassSeeder extends Seeder
{
    /**
     * Seed the classes table.
     *
     * Creates 5 classes for each organization:
     * - درجة ابتدائیه (Primary degree)
     * - درجه متوسطه (Intermediate degree)
     * - درجة اولي (First degree)
     * - موقف علیه (Higher position)
     * - دورة الحدیث (Hadith course)
     */
    public function run(): void
    {
        $this->command->info('Seeding classes...');

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
            $this->command->info("Creating classes for {$organization->name}...");

            // Create classes for this organization
            $created = $this->createClassesForOrganization($organization->id);
            $totalCreated += $created;

            $this->command->info("  → Created {$created} class(es) for {$organization->name}");

            // Assign 3 classes to academic years
            $this->command->info("Assigning classes to academic years for {$organization->name}...");
            $assigned = $this->assignClassesToAcademicYears($organization->id);
            $this->command->info("  → Assigned {$assigned} class(es) to academic years");
        }

        if ($totalCreated > 0) {
            $this->command->info("  → Total: Created {$totalCreated} class(es)");
        }

        $this->command->info('✅ Classes seeded successfully!');
    }

    /**
     * Create classes for a specific organization
     */
    protected function createClassesForOrganization(string $organizationId): int
    {
        $createdCount = 0;

        // Define the classes to create
        $classes = [
            [
                'name' => 'درجة ابتدائیه',
                'code' => 'PRIMARY',
                'grade_level' => 1,
                'description' => 'Primary degree class',
                'default_capacity' => 30,
            ],
            [
                'name' => 'درجه متوسطه',
                'code' => 'INTERMEDIATE',
                'grade_level' => 2,
                'description' => 'Intermediate degree class',
                'default_capacity' => 30,
            ],
            [
                'name' => 'درجة اولي',
                'code' => 'FIRST_DEGREE',
                'grade_level' => 3,
                'description' => 'First degree class',
                'default_capacity' => 30,
            ],
            [
                'name' => 'موقف علیه',
                'code' => 'HIGHER_POSITION',
                'grade_level' => 4,
                'description' => 'Higher position class',
                'default_capacity' => 30,
            ],
            [
                'name' => 'دورة الحدیث',
                'code' => 'HADITH_COURSE',
                'grade_level' => null,
                'description' => 'Hadith course class',
                'default_capacity' => 30,
            ],
        ];

        foreach ($classes as $classData) {
            $created = $this->createClass(
                $organizationId,
                $classData['name'],
                $classData['code'],
                $classData['grade_level'],
                $classData['description'],
                $classData['default_capacity']
            );

            if ($created) {
                $createdCount++;
            }
        }

        return $createdCount;
    }

    /**
     * Create a class if it doesn't already exist
     */
    protected function createClass(
        string $organizationId,
        string $name,
        string $code,
        ?int $gradeLevel,
        string $description,
        int $defaultCapacity
    ): bool {
        // Check if class already exists for this organization (by code)
        $existing = ClassModel::where('organization_id', $organizationId)
            ->where('code', $code)
            ->whereNull('deleted_at')
            ->first();

        if ($existing) {
            $this->command->info("  ✓ Class '{$name}' ({$code}) already exists for organization.");
            return false;
        }

        ClassModel::create([
            'organization_id' => $organizationId,
            'name' => $name,
            'code' => $code,
            'grade_level' => $gradeLevel,
            'description' => $description,
            'default_capacity' => $defaultCapacity,
            'is_active' => true,
        ]);

        $this->command->info("  ✓ Created class: {$name} ({$code})");

        return true;
    }

    /**
     * Assign 3 classes to academic years for an organization
     */
    protected function assignClassesToAcademicYears(string $organizationId): int
    {
        // Get all academic years for this organization
        $academicYears = AcademicYear::where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->orderBy('is_current', 'desc') // Current year first
            ->get();

        if ($academicYears->isEmpty()) {
            $this->command->warn("  ⚠ No academic years found for organization. Skipping class assignments.");
            return 0;
        }

        // Get first 3 classes for this organization
        $classes = ClassModel::where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->orderBy('grade_level', 'asc')
            ->limit(3)
            ->get();

        if ($classes->isEmpty()) {
            $this->command->warn("  ⚠ No classes found for organization. Skipping assignments.");
            return 0;
        }

        $assignedCount = 0;

        // Assign each class to all academic years
        foreach ($classes as $class) {
            foreach ($academicYears as $academicYear) {
                // Check if assignment already exists
                $existing = ClassAcademicYear::where('class_id', $class->id)
                    ->where('academic_year_id', $academicYear->id)
                    ->whereNull('deleted_at')
                    ->first();

                if ($existing) {
                    $this->command->info("  ✓ Class '{$class->name}' already assigned to academic year '{$academicYear->name}'");
                    continue;
                }

                // Get class capacity
                $capacity = $class->default_capacity ?? 30;

                ClassAcademicYear::create([
                    'class_id' => $class->id,
                    'academic_year_id' => $academicYear->id,
                    'organization_id' => $organizationId,
                    'section_name' => null, // Default section
                    'capacity' => $capacity,
                    'current_student_count' => 0,
                    'is_active' => true,
                ]);

                $this->command->info("  ✓ Assigned class '{$class->name}' to academic year '{$academicYear->name}'");
                $assignedCount++;
            }
        }

        return $assignedCount;
    }
}
