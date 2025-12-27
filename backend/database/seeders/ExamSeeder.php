<?php

namespace Database\Seeders;

use App\Models\Exam;
use App\Models\AcademicYear;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ExamSeeder extends Seeder
{
    /**
     * Seed the exams table.
     *
     * Creates exams for each organization and academic year:
     * - 1 quarterly exam (څلور میاشتنی) per academic year
     * - 1 annual exam (سالانه) per academic year
     */
    public function run(): void
    {
        $this->command->info('Seeding exams...');

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
            $this->command->info("Creating exams for {$organization->name}...");

            // Get all academic years for this organization
            $academicYears = AcademicYear::where('organization_id', $organization->id)
                ->whereNull('deleted_at')
                ->get();

            if ($academicYears->isEmpty()) {
                $this->command->warn("  ⚠ No academic years found for {$organization->name}. Skipping.");
                continue;
            }

            foreach ($academicYears as $academicYear) {
                // Get school_id from academic_year
                if (!$academicYear->school_id) {
                    $this->command->warn("  ⚠ Academic year '{$academicYear->name}' has no school_id. Skipping.");
                    continue;
                }

                $this->command->info("  Creating exams for academic year: {$academicYear->name}...");

                // Create quarterly exam (1 per academic year)
                $quarterlyCreated = $this->createQuarterlyExam($organization->id, $academicYear);
                $totalCreated += $quarterlyCreated;

                // Create annual exam (1 per academic year)
                $annualCreated = $this->createAnnualExam($organization->id, $academicYear);
                $totalCreated += $annualCreated;

                $this->command->info("    → Created {$quarterlyCreated} quarterly exam(s) and {$annualCreated} annual exam(s)");
            }
        }

        if ($totalCreated > 0) {
            $this->command->info("  → Total: Created {$totalCreated} exam(s)");
        }

        $this->command->info('✅ Exams seeded successfully!');
    }

    /**
     * Create quarterly exam (څلور میاشتنی) for an academic year
     * Creates 1 quarterly exam in the middle of the academic year
     */
    protected function createQuarterlyExam(string $organizationId, AcademicYear $academicYear): int
    {
        $startDate = Carbon::parse($academicYear->start_date);
        $endDate = Carbon::parse($academicYear->end_date);

        // Calculate mid-point of academic year for quarterly exam
        $totalDays = $startDate->diffInDays($endDate);
        $midPoint = (int) ($totalDays / 2);
        
        // Quarterly exam happens around the middle of the academic year
        // Set it to span about 1 month around the midpoint
        $quarterlyStart = $startDate->copy()->addDays($midPoint)->subDays(15);
        $quarterlyEnd = $startDate->copy()->addDays($midPoint)->addDays(15);

        // Ensure dates don't exceed academic year boundaries
        if ($quarterlyStart->lt($startDate)) {
            $quarterlyStart = $startDate->copy();
        }
        if ($quarterlyEnd->gt($endDate)) {
            $quarterlyEnd = $endDate->copy();
        }

        $examName = "څلور میاشتنی";
        $examDescription = "څلور میاشتنی ازموینه";

        $created = $this->createExam(
            $organizationId,
            $academicYear->id,
            $examName,
            $examDescription,
            $quarterlyStart,
            $quarterlyEnd
        );

        return $created ? 1 : 0;
    }

    /**
     * Create annual exam (سالانه) for an academic year
     */
    protected function createAnnualExam(string $organizationId, AcademicYear $academicYear): int
    {
        $startDate = Carbon::parse($academicYear->start_date);
        $endDate = Carbon::parse($academicYear->end_date);

        // Annual exam typically happens at the end of the academic year
        // Set it to the last month of the academic year
        $annualStart = $endDate->copy()->subMonths(1)->startOfMonth();
        $annualEnd = $endDate->copy();

        $examName = "سالانه";
        $examDescription = "کالیزه ازموینه";

        $created = $this->createExam(
            $organizationId,
            $academicYear->id,
            $examName,
            $examDescription,
            $annualStart,
            $annualEnd
        );

        return $created ? 1 : 0;
    }

    /**
     * Create an exam if it doesn't already exist
     */
    protected function createExam(
        string $organizationId,
        string $academicYearId,
        string $name,
        string $description,
        Carbon $startDate,
        Carbon $endDate
    ): bool {
        // Check if exam already exists for this organization and academic year
        $existing = Exam::where('organization_id', $organizationId)
            ->where('academic_year_id', $academicYearId)
            ->where('name', $name)
            ->whereNull('deleted_at')
            ->first();

        if ($existing) {
            $this->command->info("    ✓ Exam '{$name}' already exists for this academic year.");
            return false;
        }

        // Get school_id from academic_year
        $academicYear = AcademicYear::find($academicYearId);
        if (!$academicYear || !$academicYear->school_id) {
            throw new \Exception("Academic year {$academicYearId} does not have a school_id");
        }

        Exam::create([
            'organization_id' => $organizationId,
            'school_id' => $academicYear->school_id,
            'academic_year_id' => $academicYearId,
            'name' => $name,
            'description' => $description,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'status' => Exam::STATUS_DRAFT,
        ]);

        $this->command->info("    ✓ Created exam: {$name} ({$startDate->format('Y-m-d')} to {$endDate->format('Y-m-d')})");

        return true;
    }
}

