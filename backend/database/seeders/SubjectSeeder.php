<?php

namespace Database\Seeders;

use App\Models\Subject;
use App\Models\ClassSubjectTemplate;
use App\Models\ClassModel;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SubjectSeeder extends Seeder
{
    /**
     * Seed the subjects table.
     *
     * Creates Islamic subjects in Arabic for each organization:
     * - القرآن الكريم (Quran)
     * - الحديث (Hadith)
     * - الفقه (Fiqh/Jurisprudence)
     * - العقيدة (Aqeedah/Creed)
     * - السيرة النبوية (Seerah/Prophet's Biography)
     * - اللغة العربية (Arabic Language)
     * - التفسير (Tafsir/Quranic Exegesis)
     * - أصول الفقه (Usul al-Fiqh/Principles of Jurisprudence)
     * - النحو والصرف (Grammar and Morphology)
     * - البلاغة (Rhetoric)
     */
    public function run(): void
    {
        $this->command->info('Seeding subjects...');

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
            $this->command->info("Creating subjects for {$organization->name}...");

            // Create subjects for this organization
            $created = $this->createSubjectsForOrganization($organization->id);
            $totalCreated += $created;

            $this->command->info("  → Created {$created} subject(s) for {$organization->name}");

            // Assign 5 subjects to classes
            $this->command->info("Assigning subjects to classes for {$organization->name}...");
            $assigned = $this->assignSubjectsToClasses($organization->id);
            $this->command->info("  → Assigned {$assigned} subject(s) to classes");
        }

        if ($totalCreated > 0) {
            $this->command->info("  → Total: Created {$totalCreated} subject(s)");
        }

        $this->command->info('✅ Subjects seeded successfully!');
    }

    /**
     * Create subjects for a specific organization
     */
    protected function createSubjectsForOrganization(string $organizationId): int
    {
        $createdCount = 0;

        // Define the subjects to create (in Arabic)
        $subjects = [
            [
                'name' => 'القرآن الكريم',
                'code' => 'QURAN',
                'description' => 'تلاوة وحفظ القرآن الكريم',
            ],
            [
                'name' => 'الحديث',
                'code' => 'HADITH',
                'description' => 'دراسة الأحاديث النبوية الشريفة',
            ],
            [
                'name' => 'الفقه',
                'code' => 'FIQH',
                'description' => 'الفقه الإسلامي والأحكام الشرعية',
            ],
            [
                'name' => 'العقيدة',
                'code' => 'AQEEDAH',
                'description' => 'عقيدة أهل السنة والجماعة',
            ],
            [
                'name' => 'السيرة النبوية',
                'code' => 'SEERAH',
                'description' => 'سيرة النبي محمد صلى الله عليه وسلم',
            ],
            [
                'name' => 'اللغة العربية',
                'code' => 'ARABIC',
                'description' => 'اللغة العربية والنحو والصرف',
            ],
            [
                'name' => 'التفسير',
                'code' => 'TAFSIR',
                'description' => 'تفسير القرآن الكريم',
            ],
            [
                'name' => 'أصول الفقه',
                'code' => 'USUL_FIQH',
                'description' => 'أصول الفقه الإسلامي',
            ],
            [
                'name' => 'النحو والصرف',
                'code' => 'GRAMMAR',
                'description' => 'النحو والصرف العربي',
            ],
            [
                'name' => 'البلاغة',
                'code' => 'RHETORIC',
                'description' => 'علم البلاغة العربية',
            ],
        ];

        foreach ($subjects as $subjectData) {
            $created = $this->createSubject(
                $organizationId,
                $subjectData['name'],
                $subjectData['code'],
                $subjectData['description']
            );

            if ($created) {
                $createdCount++;
            }
        }

        return $createdCount;
    }

    /**
     * Create a subject if it doesn't already exist
     */
    protected function createSubject(
        string $organizationId,
        string $name,
        string $code,
        string $description
    ): bool {
        // Check if subject already exists for this organization (by code)
        $existing = Subject::where('organization_id', $organizationId)
            ->where('code', $code)
            ->whereNull('deleted_at')
            ->first();

        if ($existing) {
            $this->command->info("  ✓ Subject '{$name}' ({$code}) already exists for organization.");
            return false;
        }

        Subject::create([
            'organization_id' => $organizationId,
            'name' => $name,
            'code' => $code,
            'description' => $description,
            'is_active' => true,
        ]);

        $this->command->info("  ✓ Created subject: {$name} ({$code})");

        return true;
    }

    /**
     * Assign 5 subjects to classes for an organization
     */
    protected function assignSubjectsToClasses(string $organizationId): int
    {
        // Get first 5 subjects for this organization
        $subjects = Subject::where('organization_id', $organizationId)
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->orderBy('code', 'asc')
            ->limit(5)
            ->get();

        if ($subjects->isEmpty()) {
            $this->command->warn("  ⚠ No active subjects found for organization. Skipping assignments.");
            return 0;
        }

        // Get all classes for this organization
        $classes = ClassModel::where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->orderBy('grade_level', 'asc')
            ->get();

        if ($classes->isEmpty()) {
            $this->command->warn("  ⚠ No classes found for organization. Skipping assignments.");
            return 0;
        }

        $assignedCount = 0;

        // Assign each subject to all classes
        foreach ($subjects as $subject) {
            foreach ($classes as $class) {
                // Check if assignment already exists
                $existing = ClassSubjectTemplate::where('class_id', $class->id)
                    ->where('subject_id', $subject->id)
                    ->whereNull('deleted_at')
                    ->first();

                if ($existing) {
                    $this->command->info("  ✓ Subject '{$subject->name}' already assigned to class '{$class->name}'");
                    continue;
                }

                ClassSubjectTemplate::create([
                    'class_id' => $class->id,
                    'subject_id' => $subject->id,
                    'organization_id' => $organizationId,
                    'is_required' => true,
                    'credits' => null,
                    'hours_per_week' => null,
                ]);

                $this->command->info("  ✓ Assigned subject '{$subject->name}' to class '{$class->name}'");
                $assignedCount++;
            }
        }

        return $assignedCount;
    }
}
