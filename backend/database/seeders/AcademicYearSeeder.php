<?php

namespace Database\Seeders;

use App\Models\AcademicYear;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AcademicYearSeeder extends Seeder
{
    /**
     * Seed the academic_years table.
     *
     * Creates 2 academic years per organization + per school (strict school scoping):
     * - Current year (is_current = true)
     * - Previous year (is_current = false)
     */
    public function run(): void
    {
        $this->command->info('Seeding academic years...');

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
            $schools = DB::table('school_branding')
                ->where('organization_id', $organization->id)
                ->whereNull('deleted_at')
                ->get();

            if ($schools->isEmpty()) {
                $this->command->warn("  ⚠ No schools found for organization {$organization->name}. Skipping academic year seeding for this org.");
                continue;
            }

            foreach ($schools as $school) {
                $this->command->info("Creating academic years for {$organization->name} - school: {$school->school_name}...");

                // Create 2 academic years for this organization and school
                $created = $this->createAcademicYearsForSchool($organization->id, $school->id);
                $totalCreated += $created;

                if ($created > 0) {
                    $this->command->info("  → Created {$created} academic year(s) for {$organization->name} - {$school->school_name}");
                }
            }
        }

        if ($totalCreated > 0) {
            $this->command->info("  → Total: Created {$totalCreated} academic year(s)");
        }

        $this->command->info('✅ Academic years seeded successfully!');
    }

    /**
     * Create academic years for a specific organization and school
     */
    protected function createAcademicYearsForSchool(string $organizationId, string $schoolId): int
    {
        $createdCount = 0;

        // Get current date
        $now = Carbon::now();

        // Year 1: Current academic year (2024-2025)
        // Start: September 1, 2024
        // End: August 31, 2025
        $currentYearStart = Carbon::create(2024, 9, 1);
        $currentYearEnd = Carbon::create(2025, 8, 31);

        // Year 2: Previous academic year (2023-2024)
        // Start: September 1, 2023
        // End: August 31, 2024
        $previousYearStart = Carbon::create(2023, 9, 1);
        $previousYearEnd = Carbon::create(2024, 8, 31);

        // Create current academic year
        $currentYear = $this->createAcademicYear(
            $organizationId,
            $schoolId,
            '2024-2025',
            $currentYearStart,
            $currentYearEnd,
            true, // is_current
            'Current academic year'
        );

        if ($currentYear) {
            $createdCount++;
        }

        // Create previous academic year
        $previousYear = $this->createAcademicYear(
            $organizationId,
            $schoolId,
            '2023-2024',
            $previousYearStart,
            $previousYearEnd,
            false, // is_current
            'Previous academic year'
        );

        if ($previousYear) {
            $createdCount++;
        }

        return $createdCount;
    }

    /**
     * Create an academic year if it doesn't already exist
     */
    protected function createAcademicYear(
        string $organizationId,
        string $schoolId,
        string $name,
        Carbon $startDate,
        Carbon $endDate,
        bool $isCurrent,
        string $description = ''
    ): ?AcademicYear {
        // Check if academic year already exists for this organization and school
        $existing = AcademicYear::where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->where('name', $name)
            ->whereNull('deleted_at')
            ->first();

        if ($existing) {
            $this->command->info("  ✓ Academic year '{$name}' already exists for this school.");
            
            // Update is_current if needed (only if it's supposed to be current)
            if ($isCurrent && !$existing->is_current) {
                // Unset other current years for this organization and school first
                AcademicYear::where('organization_id', $organizationId)
                    ->where('school_id', $schoolId)
                    ->where('id', '!=', $existing->id)
                    ->whereNull('deleted_at')
                    ->update(['is_current' => false]);
                
                // Set this one as current
                $existing->update(['is_current' => true]);
                $this->command->info("  ✓ Updated academic year '{$name}' to be current.");
            }
            
            return null; // Already exists
        }

        // If this is the current year, unset other current years for this organization and school first
        if ($isCurrent) {
            AcademicYear::where('organization_id', $organizationId)
                ->where('school_id', $schoolId)
                ->whereNull('deleted_at')
                ->update(['is_current' => false]);
        }

        $academicYear = AcademicYear::create([
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'name' => $name,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'is_current' => $isCurrent,
            'description' => $description,
            'status' => 'active',
        ]);

        $this->command->info("  ✓ Created academic year: {$name} ({$startDate->format('Y-m-d')} to {$endDate->format('Y-m-d')})" . ($isCurrent ? ' [CURRENT]' : ''));

        return $academicYear;
    }
}

