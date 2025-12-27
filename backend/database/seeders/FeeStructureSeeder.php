<?php

namespace Database\Seeders;

use App\Models\FeeStructure;
use App\Models\SchoolBranding;
use App\Models\AcademicYear;
use App\Models\ClassAcademicYear;
use App\Models\Currency;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class FeeStructureSeeder extends Seeder
{
    /**
     * Seed the fee_structures table.
     *
     * Creates 4 fee structures (monthly, one-time, semester, annual) for each class
     * in all existing academic years that have classes assigned.
     */
    public function run(): void
    {
        $this->command->info('Seeding fee structures...');

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
            $this->command->info("Creating fee structures for {$organization->name}...");

            // Get all schools for this organization
            $schools = DB::table('school_branding')
                ->where('organization_id', $organization->id)
                ->whereNull('deleted_at')
                ->get();

            if ($schools->isEmpty()) {
                $this->command->warn("  ⚠ No schools found for organization {$organization->name}. Skipping fee structure seeding for this org.");
                continue;
            }

            foreach ($schools as $school) {
                $this->command->info("Creating fee structures for {$organization->name} - school: {$school->school_name}...");

                // Get base currency for this school
                $currency = Currency::where('organization_id', $organization->id)
                    ->where('school_id', $school->id)
                    ->where('is_base', true)
                    ->where('is_active', true)
                    ->whereNull('deleted_at')
                    ->first();

                if (!$currency) {
                    $this->command->warn("  ⚠ No base currency found for {$organization->name} - {$school->school_name}. Fee structures will be created without currency.");
                } else {
                    $this->command->info("Using currency: {$currency->code} - {$currency->name}");
                }

                // Find all existing academic years that have classes assigned for this school
                // Get academic years that have at least one class_academic_year
                $organizationId = $organization->id;
                $schoolId = $school->id;
                $academicYears = AcademicYear::where('organization_id', $organizationId)
                    ->where('school_id', $schoolId)
                    ->whereNull('deleted_at')
                    ->whereHas('classAcademicYears', function ($query) use ($organizationId, $schoolId) {
                        $query->where('organization_id', $organizationId)
                            ->where('school_id', $schoolId)
                            ->whereNull('deleted_at')
                            ->where('is_active', true);
                    })
                    ->orderBy('start_date', 'desc')
                    ->get();

                if ($academicYears->isEmpty()) {
                    $this->command->warn("  ⚠ No academic years with classes found for {$organization->name} - {$school->school_name}. Skipping.");
                    continue;
                }

                $this->command->info("Found {$academicYears->count()} academic year(s) with classes:");

                // Process each academic year that has classes
                foreach ($academicYears as $academicYear) {
                    $this->command->info("Processing academic year: {$academicYear->name} (ID: {$academicYear->id})");
                    $created = $this->createFeeStructuresForAcademicYear(
                        $organization->id,
                        $school->id,
                        $academicYear->id,
                        $currency?->id
                    );
                    $totalCreated += $created;
                    if ($created > 0) {
                        $this->command->info("  → Created {$created} fee structure(s) for academic year {$academicYear->name}");
                    }
                }
            }
        }

        if ($totalCreated > 0) {
            $this->command->info("  → Total: Created {$totalCreated} fee structure(s)");
        }

        $this->command->info('✅ Fee structures seeded successfully!');
    }

    /**
     * Create fee structures for all classes in an academic year
     */
    protected function createFeeStructuresForAcademicYear(
        string $organizationId,
        string $schoolId,
        string $academicYearId,
        ?string $currencyId
    ): int {
        // Get all class academic years for this academic year and school
        $classAcademicYears = ClassAcademicYear::where('academic_year_id', $academicYearId)
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->where('is_active', true)
            ->with('class')
            ->get();

        if ($classAcademicYears->isEmpty()) {
            $this->command->warn("  ⚠ No classes found for academic year. Skipping fee structure creation.");
            return 0;
        }

        $createdCount = 0;

        // Define the 4 fee types to create
        $feeTypes = [
            [
                'fee_type' => 'monthly',
                'name' => 'Monthly Fee',
                'code' => 'MONTHLY',
                'description' => 'Monthly tuition fee',
                'amount' => 5000.00,
                'display_order' => 1,
            ],
            [
                'fee_type' => 'one_time',
                'name' => 'One-Time Fee',
                'code' => 'ONE_TIME',
                'description' => 'One-time admission fee',
                'amount' => 10000.00,
                'display_order' => 2,
            ],
            [
                'fee_type' => 'semester',
                'name' => 'Semester Fee',
                'code' => 'SEMESTER',
                'description' => 'Semester tuition fee',
                'amount' => 25000.00,
                'display_order' => 3,
            ],
            [
                'fee_type' => 'annual',
                'name' => 'Annual Fee',
                'code' => 'ANNUAL',
                'description' => 'Annual tuition fee',
                'amount' => 50000.00,
                'display_order' => 4,
            ],
        ];

        foreach ($classAcademicYears as $classAcademicYear) {
            // Get the class model (eager loaded via with('class'))
            $class = $classAcademicYear->class;
            
            if (!$class) {
                $this->command->warn("      ⚠ Class not found for class_academic_year ID: {$classAcademicYear->id}");
                continue;
            }

            $this->command->info("    Processing class: {$class->name} (ID: {$class->id})");

            $feeIndex = 0;
            foreach ($feeTypes as $feeTypeData) {
                // Check if fee structure already exists (by organization_id, school_id, academic_year_id, class_academic_year_id, and fee_type)
                $existing = FeeStructure::where('organization_id', $organizationId)
                    ->where('school_id', $schoolId)
                    ->where('academic_year_id', $academicYearId)
                    ->where('class_academic_year_id', $classAcademicYear->id)
                    ->where('fee_type', $feeTypeData['fee_type'])
                    ->whereNull('deleted_at')
                    ->first();

                if ($existing) {
                    $this->command->info("      ⊘ Fee structure '{$feeTypeData['name']}' already exists for class '{$class->name}'");
                    $feeIndex++;
                    continue;
                }

                // Get academic year dates for due dates
                $academicYear = AcademicYear::find($academicYearId);
                $dueDate = $academicYear?->start_date ? Carbon::parse($academicYear->start_date)->addMonth() : null;

                // Generate short code (max 50 characters)
                // Format: {FEE_TYPE}_{SHORT_ID}_{INDEX} (e.g., MONTHLY_abc123_1, ONE_TIME_def456_2)
                // Use first 8 chars of class_academic_year_id + index to ensure uniqueness
                $shortId = substr(str_replace('-', '', $classAcademicYear->id), 0, 8);
                $code = strtoupper($feeTypeData['code'] . '_' . $shortId . '_' . ($feeIndex + 1));
                // Ensure code is max 50 characters
                if (strlen($code) > 50) {
                    $code = substr($code, 0, 50);
                }

                // Create fee structure
                FeeStructure::create([
                    'organization_id' => $organizationId,
                    'school_id' => $schoolId,
                    'academic_year_id' => $academicYearId,
                    'class_id' => $class->id,
                    'class_academic_year_id' => $classAcademicYear->id,
                    'name' => $feeTypeData['name'],
                    'code' => $code,
                    'description' => $feeTypeData['description'],
                    'fee_type' => $feeTypeData['fee_type'],
                    'amount' => $feeTypeData['amount'],
                    'currency_id' => $currencyId,
                    'due_date' => $dueDate,
                    'start_date' => $academicYear?->start_date,
                    'end_date' => $academicYear?->end_date,
                    'is_active' => true,
                    'is_required' => true,
                    'display_order' => $feeTypeData['display_order'],
                ]);

                $this->command->info("      ✓ Created fee structure: {$feeTypeData['name']} for class '{$class->name}'");
                $createdCount++;
                $feeIndex++;
            }
        }

        return $createdCount;
    }
}

