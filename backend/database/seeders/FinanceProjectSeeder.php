<?php

namespace Database\Seeders;

use App\Models\FinanceProject;
use App\Models\Currency;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class FinanceProjectSeeder extends Seeder
{
    /**
     * Seed the finance_projects table.
     *
     * Creates 2 projects for each organization:
     * - Masjid Project (مسجد پروژه)
     * - New Office Building Project (نوی دفتر ودانی پروژه)
     */
    public function run(): void
    {
        $this->command->info('Seeding finance projects...');

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
            $this->command->info("Creating finance projects for {$organization->name}...");

            // Get all schools for this organization
            $schools = DB::table('school_branding')
                ->where('organization_id', $organization->id)
                ->whereNull('deleted_at')
                ->get();

            if ($schools->isEmpty()) {
                $this->command->warn("  ⚠ No schools found for organization {$organization->name}. Skipping finance project seeding for this org.");
                continue;
            }

            foreach ($schools as $school) {
                $this->command->info("Creating finance projects for {$organization->name} - school: {$school->school_name}...");

                // Get base currency for this school
                $baseCurrency = Currency::where('organization_id', $organization->id)
                    ->where('school_id', $school->id)
                    ->where('is_base', true)
                    ->where('is_active', true)
                    ->whereNull('deleted_at')
                    ->first();

                if (!$baseCurrency) {
                    $this->command->warn("  ⚠ No base currency found for {$organization->name} - {$school->school_name}. Projects will be created without currency.");
                }

                // Create projects for this school
                $created = $this->createProjectsForSchool($organization->id, $school->id, $baseCurrency?->id);
                $totalCreated += $created;

                if ($created > 0) {
                    $this->command->info("  → Created {$created} project(s) for {$organization->name} - {$school->school_name}");
                }
            }
        }

        if ($totalCreated > 0) {
            $this->command->info("  → Total: Created {$totalCreated} project(s)");
        }

        $this->command->info('✅ Finance projects seeded successfully!');
    }

    /**
     * Create finance projects for a specific school
     */
    protected function createProjectsForSchool(string $organizationId, string $schoolId, ?string $currencyId = null): int
    {
        $createdCount = 0;
        $today = Carbon::today();
        $startDate = $today->copy()->startOfYear();
        $endDate = $today->copy()->endOfYear()->addMonths(6); // 18 months project

        // Define the projects to create (2 projects)
        $projects = [
            [
                'name' => 'مسجد پروژه',
                'code' => 'MASJID_PROJECT',
                'description' => 'د نوي مسجد د جوړولو پروژه - د نماز، دینی زده کړو، او د ټولنې د فعالیتونو لپاره د مسجد د ودانیو جوړول.',
                'budget_amount' => 1000000.00,
                'status' => 'active',
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            [
                'name' => 'نوی دفتر ودانی پروژه',
                'code' => 'NEW_OFFICE_BUILDING',
                'description' => 'د نوي دفتر ودانیو د جوړولو پروژه - د ادارې د فعالیتونو د پراختیا، د کارمندانو د دفترونو، او د کنفرانس اطاق لپاره.',
                'budget_amount' => 1500000.00,
                'status' => 'active',
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ];

        foreach ($projects as $projectData) {
            // Check if project already exists for this school (by code, organization_id, and school_id)
            $exists = FinanceProject::where('organization_id', $organizationId)
                ->where('school_id', $schoolId)
                ->where('code', $projectData['code'])
                ->whereNull('deleted_at')
                ->exists();

            if (!$exists) {
                FinanceProject::create([
                    'organization_id' => $organizationId,
                    'school_id' => $schoolId,
                    'currency_id' => $currencyId,
                    'name' => $projectData['name'],
                    'code' => $projectData['code'],
                    'description' => $projectData['description'],
                    'budget_amount' => $projectData['budget_amount'],
                    'total_income' => 0,
                    'total_expense' => 0,
                    'start_date' => $projectData['start_date'],
                    'end_date' => $projectData['end_date'],
                    'status' => $projectData['status'],
                    'is_active' => true,
                ]);

                $createdCount++;
                $this->command->info("    ✓ Created project: {$projectData['name']} ({$projectData['code']})");
            } else {
                $this->command->info("    ⊘ Project {$projectData['code']} already exists for this school");
            }
        }

        return $createdCount;
    }
}

