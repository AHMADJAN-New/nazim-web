<?php

namespace Database\Seeders;

use App\Models\ClassModel;
use App\Models\ClassAcademicYear;
use App\Models\AcademicYear;
use App\Models\ClassSubjectTemplate;
use App\Models\ClassSubject;
use App\Models\Subject;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ClassAcademicYearSubjectSeeder extends Seeder
{
    /**
     * Seed class_academic_years and class_subjects tables.
     *
     * For each organization:
     * 1. Creates class_academic_year entries if they don't exist (assigns classes to academic years)
     * 2. Assigns subjects from class_subject_templates to class_academic_years (creates class_subjects)
     */
    public function run(): void
    {
        $this->command->info('Seeding class academic years and subjects...');

        // Process organizations in chunks to avoid memory issues
        $totalClassAcademicYearsCreated = 0;
        $totalClassSubjectsCreated = 0;

        DB::table('organizations')
            ->whereNull('deleted_at')
            ->orderBy('id')
            ->chunkById(10, function ($organizations) use (&$totalClassAcademicYearsCreated, &$totalClassSubjectsCreated) {
                foreach ($organizations as $organization) {
                    $this->command->info("Processing {$organization->name}...");

                    // Get all schools for this organization (chunked)
                    $schools = DB::table('school_branding')
                        ->where('organization_id', $organization->id)
                        ->whereNull('deleted_at')
                        ->get();

                    if ($schools->isEmpty()) {
                        $this->command->warn("  ⚠ No schools found for organization {$organization->name}. Skipping class academic year subject seeding for this org.");
                        continue;
                    }

                    foreach ($schools as $school) {
                        $this->command->info("Processing {$organization->name} - school: {$school->school_name}...");

                        // Step 1: Create class_academic_year entries if they don't exist
                        $classAcademicYearsCreated = $this->createClassAcademicYears($organization->id, $school->id);
                        $totalClassAcademicYearsCreated += $classAcademicYearsCreated;

                        // Step 2: Assign subjects to class_academic_years
                        $classSubjectsCreated = $this->assignSubjectsToClassAcademicYears($organization->id, $school->id);
                        $totalClassSubjectsCreated += $classSubjectsCreated;

                        if ($classAcademicYearsCreated > 0) {
                            $this->command->info("  → Created {$classAcademicYearsCreated} class-academic year(s)");
                        }
                        if ($classSubjectsCreated > 0) {
                            $this->command->info("  → Created {$classSubjectsCreated} class-subject assignment(s)");
                        }

                        // Free memory
                        unset($school);
                    }

                    // Free memory
                    unset($organization, $schools);
                }
            });

        if ($totalClassAcademicYearsCreated > 0 || $totalClassSubjectsCreated > 0) {
            $this->command->info("  → Total: Created {$totalClassAcademicYearsCreated} class-academic year(s)");
            $this->command->info("  → Total: Created {$totalClassSubjectsCreated} class-subject assignment(s)");
        }

        $this->command->info('✅ Class academic years and subjects seeded successfully!');
    }

    /**
     * Create class_academic_year entries for all classes and academic years for a school
     * Only creates if they don't already exist
     */
    protected function createClassAcademicYears(string $organizationId, string $schoolId): int
    {
        // Get all academic years for this school (use select to reduce memory)
        $academicYears = AcademicYear::where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->select('id', 'name')
            ->get();

        if ($academicYears->isEmpty()) {
            $this->command->warn("  ⚠ No academic years found for this school. Skipping.");
            return 0;
        }

        // Get all classes for this school (use select to reduce memory)
        $classes = ClassModel::where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->select('id', 'name', 'default_capacity')
            ->get();

        if ($classes->isEmpty()) {
            $this->command->warn("  ⚠ No classes found for this school. Skipping.");
            return 0;
        }

        $createdCount = 0;

        // Create class_academic_year for each class + academic year combination
        foreach ($classes as $class) {
            foreach ($academicYears as $academicYear) {
                // Check if class_academic_year already exists (use exists() for better performance)
                $exists = ClassAcademicYear::where('class_id', $class->id)
                    ->where('academic_year_id', $academicYear->id)
                    ->whereNull('deleted_at')
                    ->exists();

                if ($exists) {
                    $this->command->info("  ✓ Class '{$class->name}' already assigned to academic year '{$academicYear->name}'");
                    continue;
                }

                // Get class capacity
                $capacity = $class->default_capacity ?? 30;

                ClassAcademicYear::create([
                    'class_id' => $class->id,
                    'academic_year_id' => $academicYear->id,
                    'organization_id' => $organizationId,
                    'school_id' => $schoolId,
                    'section_name' => null, // Default section
                    'capacity' => $capacity,
                    'current_student_count' => 0,
                    'is_active' => true,
                ]);

                $this->command->info("  ✓ Created class-academic year: '{$class->name}' → '{$academicYear->name}'");
                $createdCount++;
            }
        }

        // Free memory
        unset($academicYears, $classes);

        return $createdCount;
    }

    /**
     * Assign subjects from class_subject_templates to class_academic_years
     * Creates class_subjects entries
     */
    protected function assignSubjectsToClassAcademicYears(string $organizationId, string $schoolId): int
    {
        $createdCount = 0;

        // Process class_academic_years in chunks to avoid memory issues
        ClassAcademicYear::where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->select('id', 'class_id')
            ->chunkById(50, function ($classAcademicYears) use ($organizationId, $schoolId, &$createdCount) {
                foreach ($classAcademicYears as $classAcademicYear) {
                    // Get class name separately to avoid eager loading
                    $class = ClassModel::where('id', $classAcademicYear->class_id)
                        ->select('name')
                        ->first();

                    if (!$class) {
                        continue;
                    }

                    // Get all subject templates for this class (must match school_id)
                    // Use select to reduce memory and avoid eager loading
                    $subjectTemplates = ClassSubjectTemplate::where('class_id', $classAcademicYear->class_id)
                        ->where('organization_id', $organizationId)
                        ->where('school_id', $schoolId)
                        ->whereNull('deleted_at')
                        ->select('id', 'subject_id', 'credits', 'hours_per_week', 'is_required')
                        ->get();

                    if ($subjectTemplates->isEmpty()) {
                        $this->command->info("  ⚠ No subject templates found for class '{$class->name}'. Skipping.");
                        continue;
                    }

                    // Get subject IDs and names in one query
                    $subjectIds = $subjectTemplates->pluck('subject_id')->unique()->toArray();
                    $subjects = Subject::whereIn('id', $subjectIds)
                        ->select('id', 'name')
                        ->get()
                        ->keyBy('id');

                    // Assign each subject from template to class_academic_year
                    foreach ($subjectTemplates as $template) {
                        $subject = $subjects->get($template->subject_id);
                        if (!$subject) {
                            continue;
                        }

                        // Check if class_subject already exists (use exists() for better performance)
                        $exists = ClassSubject::where('class_academic_year_id', $classAcademicYear->id)
                            ->where('subject_id', $template->subject_id)
                            ->whereNull('deleted_at')
                            ->exists();

                        if ($exists) {
                            $this->command->info("  ✓ Subject '{$subject->name}' already assigned to class-academic year '{$class->name}'");
                            continue;
                        }

                        // Create class_subject entry
                        ClassSubject::create([
                            'class_subject_template_id' => $template->id,
                            'class_academic_year_id' => $classAcademicYear->id,
                            'subject_id' => $template->subject_id,
                            'organization_id' => $organizationId,
                            'school_id' => $schoolId,
                            'teacher_id' => null, // Can be assigned later
                            'room_id' => null, // Can be assigned later
                            'credits' => $template->credits,
                            'hours_per_week' => $template->hours_per_week,
                            'is_required' => $template->is_required,
                        ]);

                        $this->command->info("  ✓ Assigned subject '{$subject->name}' to class-academic year '{$class->name}'");
                        $createdCount++;
                    }

                    // Free memory after each class_academic_year
                    unset($class, $subjectTemplates, $subjects, $subjectIds);
                }

                // Free memory after each chunk
                unset($classAcademicYears);
            });

        return $createdCount;
    }
}

