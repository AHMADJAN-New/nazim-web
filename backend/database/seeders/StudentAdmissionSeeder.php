<?php

namespace Database\Seeders;

use App\Models\StudentAdmission;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StudentAdmissionSeeder extends Seeder
{
    /**
     * Seed the student_admissions table.
     *
     * Admits 3 current students to 3 different classes.
     */
    public function run(): void
    {
        $this->command->info('Seeding student admissions...');

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
            $this->command->info("Creating student admissions for {$organization->name}...");

            $created = $this->createAdmissionsForOrganization($organization->id);
            $totalCreated += $created;

            $this->command->info("  → Created {$created} admission(s) for {$organization->name}");
        }

        if ($totalCreated > 0) {
            $this->command->info("  → Total: Created {$totalCreated} admission(s)");
        }

        $this->command->info('✅ Student admissions seeded successfully!');
    }

    /**
     * Create student admissions for a specific organization
     */
    protected function createAdmissionsForOrganization(string $organizationId): int
    {
        $createdCount = 0;

        // Get 3 students for this organization (not already admitted)
        $students = DB::table('students')
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->whereNotIn('id', function ($query) use ($organizationId) {
                $query->select('student_id')
                    ->from('student_admissions')
                    ->where('organization_id', $organizationId)
                    ->whereNull('deleted_at');
            })
            ->limit(3)
            ->get();

        if ($students->isEmpty()) {
            $this->command->warn("  ⚠ No available students found for {$organizationId}. Skipping.");
            return 0;
        }

        if ($students->count() < 3) {
            $this->command->warn("  ⚠ Only {$students->count()} available student(s) found. Will admit {$students->count()} student(s).");
        }

        // Get current academic year for this organization
        $academicYear = DB::table('academic_years')
            ->where('organization_id', $organizationId)
            ->where('is_current', true)
            ->whereNull('deleted_at')
            ->first();

        if (!$academicYear) {
            $this->command->warn("  ⚠ No current academic year found for {$organizationId}. Skipping.");
            return 0;
        }

        // Get 3 different class academic years for this academic year
        $classAcademicYears = DB::table('class_academic_years')
            ->where('academic_year_id', $academicYear->id)
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->limit(3)
            ->get();

        if ($classAcademicYears->isEmpty()) {
            $this->command->warn("  ⚠ No class academic years found for academic year '{$academicYear->name}'. Skipping.");
            return 0;
        }

        if ($classAcademicYears->count() < 3) {
            $this->command->warn("  ⚠ Only {$classAcademicYears->count()} class academic year(s) found. Will use {$classAcademicYears->count()} class(es).");
        }

        // Get class IDs and school IDs from class academic years
        $classIds = $classAcademicYears->pluck('class_id')->filter()->unique();
        $classes = DB::table('classes')
            ->whereIn('id', $classIds)
            ->whereNull('deleted_at')
            ->get()
            ->keyBy('id');

        // Get schools for this organization
        $schools = DB::table('school_branding')
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->get();

        // Get residency types for this organization
        $residencyTypes = DB::table('residency_types')
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->get();

        // Admit each student to a different class
        $admissionCount = min($students->count(), $classAcademicYears->count(), 3);
        
        for ($i = 0; $i < $admissionCount; $i++) {
            $student = $students[$i];
            $classAcademicYear = $classAcademicYears[$i];
            $class = $classes[$classAcademicYear->class_id] ?? null;

            // Check if admission already exists
            $existing = DB::table('student_admissions')
                ->where('student_id', $student->id)
                ->where('academic_year_id', $academicYear->id)
                ->whereNull('deleted_at')
                ->exists();

            if ($existing) {
                $this->command->info("  ⚠ Student {$student->full_name} ({$student->admission_no}) already admitted for academic year '{$academicYear->name}'. Skipping.");
                continue;
            }

            // Get school from student or class, or use first available school
            $schoolId = $student->school_id;
            if (!$schoolId && $class && $class->school_id) {
                $schoolId = $class->school_id;
            }
            if (!$schoolId && $schools->isNotEmpty()) {
                $schoolId = $schools->first()->id;
            }

            // Get a residency type (optional)
            $residencyTypeId = $residencyTypes->isNotEmpty() ? $residencyTypes->first()->id : null;

            // Create admission
            $admissionId = (string) Str::uuid();
            
            DB::table('student_admissions')->insert([
                'id' => $admissionId,
                'organization_id' => $organizationId,
                'school_id' => $schoolId,
                'student_id' => $student->id,
                'academic_year_id' => $academicYear->id,
                'class_id' => $classAcademicYear->class_id,
                'class_academic_year_id' => $classAcademicYear->id,
                'residency_type_id' => $residencyTypeId,
                'room_id' => null,
                'admission_year' => date('Y'),
                'admission_date' => now()->toDateString(),
                'enrollment_status' => 'active',
                'enrollment_type' => 'regular',
                'shift' => 'morning',
                'is_boarder' => false,
                'fee_status' => 'paid',
                'placement_notes' => 'Admitted via seeder',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $className = $class ? $class->name : 'Unknown Class';
            $this->command->info("  ✓ Admitted student {$student->full_name} ({$student->admission_no}) to class '{$className}' for academic year '{$academicYear->name}'");
            $createdCount++;
        }

        return $createdCount;
    }
}
