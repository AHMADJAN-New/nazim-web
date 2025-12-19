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
     * in academic years 12 (2025) and 1 (2026) for school 1.
     */
    public function run(): void
    {
        $this->command->info('Seeding fee structures...');

        // Get school 1 (first school from Organization One)
        $school = SchoolBranding::whereNull('deleted_at')
            ->orderBy('created_at', 'asc')
            ->first();

        if (!$school) {
            $this->command->warn('No school found. Please run SchoolBrandingSeeder first.');
            return;
        }

        $this->command->info("Using school: {$school->school_name} (ID: {$school->id})");

        // Get organization_id from school
        $organizationId = $school->organization_id;

        // Get base currency for the organization
        $currency = Currency::where('organization_id', $organizationId)
            ->where('is_base', true)
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->first();

        if (!$currency) {
            $this->command->warn("  ⚠ No base currency found for organization. Fee structures will be created without currency.");
        } else {
            $this->command->info("Using currency: {$currency->code} - {$currency->name}");
        }

        // Find academic years for 2025 and 2026
        // Try to find academic years that contain "2025" or "2026" in their names
        // Or academic years that start in 2025 or 2026
        $academicYear2025 = $this->findOrCreateAcademicYear($organizationId, '2025-2026', 2025);
        $academicYear2026 = $this->findOrCreateAcademicYear($organizationId, '2026-2027', 2026);

        if (!$academicYear2025 && !$academicYear2026) {
            $this->command->warn('No academic years found for 2025 or 2026. Please create academic years first.');
            return;
        }

        $totalCreated = 0;

        // Process academic year 2025
        if ($academicYear2025) {
            $this->command->info("Processing academic year: {$academicYear2025->name} (ID: {$academicYear2025->id})");
            $created = $this->createFeeStructuresForAcademicYear(
                $organizationId,
                $school->id,
                $academicYear2025->id,
                $currency?->id
            );
            $totalCreated += $created;
            $this->command->info("  → Created {$created} fee structure(s) for academic year {$academicYear2025->name}");
        }

        // Process academic year 2026
        if ($academicYear2026) {
            $this->command->info("Processing academic year: {$academicYear2026->name} (ID: {$academicYear2026->id})");
            $created = $this->createFeeStructuresForAcademicYear(
                $organizationId,
                $school->id,
                $academicYear2026->id,
                $currency?->id
            );
            $totalCreated += $created;
            $this->command->info("  → Created {$created} fee structure(s) for academic year {$academicYear2026->name}");
        }

        if ($totalCreated > 0) {
            $this->command->info("  → Total: Created {$totalCreated} fee structure(s)");
        }

        $this->command->info('✅ Fee structures seeded successfully!');
    }

    /**
     * Find or create an academic year for a specific year
     */
    protected function findOrCreateAcademicYear(string $organizationId, string $name, int $year): ?AcademicYear
    {
        // First, try to find by name containing the year
        $academicYear = AcademicYear::where('organization_id', $organizationId)
            ->where('name', 'like', "%{$year}%")
            ->whereNull('deleted_at')
            ->first();

        if ($academicYear) {
            $this->command->info("  ✓ Found academic year: {$academicYear->name}");
            return $academicYear;
        }

        // If not found, try to find by start_date year
        $academicYear = AcademicYear::where('organization_id', $organizationId)
            ->whereYear('start_date', $year)
            ->whereNull('deleted_at')
            ->first();

        if ($academicYear) {
            $this->command->info("  ✓ Found academic year: {$academicYear->name} (starts in {$year})");
            return $academicYear;
        }

        // If still not found, create a new one
        $startDate = Carbon::create($year, 9, 1); // September 1
        $endDate = Carbon::create($year + 1, 8, 31); // August 31 of next year

        $academicYear = AcademicYear::create([
            'organization_id' => $organizationId,
            'name' => $name,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'is_current' => false,
            'description' => "Academic year {$name}",
            'status' => 'active',
        ]);

        $this->command->info("  ✓ Created academic year: {$name}");
        return $academicYear;
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
        // Get all class academic years for this academic year
        $classAcademicYears = ClassAcademicYear::where('academic_year_id', $academicYearId)
            ->where('organization_id', $organizationId)
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
                // Check if fee structure already exists
                $existing = FeeStructure::where('organization_id', $organizationId)
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

