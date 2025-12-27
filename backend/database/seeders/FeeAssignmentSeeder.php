<?php

namespace Database\Seeders;

use App\Models\FeeAssignment;
use App\Models\FeeStructure;
use App\Models\StudentAdmission;
use App\Models\AcademicYear;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class FeeAssignmentSeeder extends Seeder
{
    /**
     * Seed the fee_assignments table.
     *
     * Creates fee assignments for students based on:
     * - Fee structures that exist
     * - Student admissions in matching academic years and classes
     */
    public function run(): void
    {
        $this->command->info('Seeding fee assignments...');

        // Get all active fee structures
        $feeStructures = FeeStructure::whereNull('deleted_at')
            ->where('is_active', true)
            ->with(['academicYear', 'classAcademicYear'])
            ->get();

        if ($feeStructures->isEmpty()) {
            $this->command->warn('No fee structures found. Please run FeeStructureSeeder first.');
            return;
        }

        $this->command->info("Found {$feeStructures->count()} fee structure(s)");

        $totalCreated = 0;
        $totalSkipped = 0;

        foreach ($feeStructures as $feeStructure) {
            $academicYearName = $feeStructure->academicYear?->name ?? 'N/A';
            $classAcademicYearId = $feeStructure->class_academic_year_id ?? 'N/A';
            
            $this->command->info("Processing fee structure: {$feeStructure->name} (ID: {$feeStructure->id})");
            $this->command->info("  → Academic Year: {$academicYearName}");
            $this->command->info("  → Class Academic Year ID: {$classAcademicYearId}");

            // Find student admissions that match this fee structure
            $matchingAdmissions = $this->findMatchingAdmissions($feeStructure);

            if ($matchingAdmissions->isEmpty()) {
                $this->command->warn("  ⚠ No matching student admissions found for this fee structure");
                continue;
            }

            $this->command->info("  → Found {$matchingAdmissions->count()} matching student admission(s)");

            foreach ($matchingAdmissions as $admission) {
                // Check if assignment already exists
                $existing = FeeAssignment::where('organization_id', $feeStructure->organization_id)
                    ->where('student_id', $admission->student_id)
                    ->where('student_admission_id', $admission->id)
                    ->where('fee_structure_id', $feeStructure->id)
                    ->where('academic_year_id', $feeStructure->academic_year_id)
                    ->whereNull('deleted_at')
                    ->first();

                if ($existing) {
                    $this->command->info("    ⊘ Fee assignment already exists for student admission ID: {$admission->id}");
                    $totalSkipped++;
                    continue;
                }

                // Calculate dates based on fee type
                $dates = $this->calculateDates($feeStructure, $admission);

                // Create fee assignment
                $assignment = FeeAssignment::create([
                    'organization_id' => $feeStructure->organization_id,
                    'school_id' => $feeStructure->school_id ?? $admission->school_id,
                    'student_id' => $admission->student_id,
                    'student_admission_id' => $admission->id,
                    'fee_structure_id' => $feeStructure->id,
                    'academic_year_id' => $feeStructure->academic_year_id,
                    'class_academic_year_id' => $feeStructure->class_academic_year_id ?? $admission->class_academic_year_id,
                    'original_amount' => $feeStructure->amount,
                    'assigned_amount' => $feeStructure->amount,
                    'currency_id' => $feeStructure->currency_id,
                    'exception_type' => 'none',
                    'exception_amount' => 0,
                    'payment_period_start' => $dates['period_start'],
                    'payment_period_end' => $dates['period_end'],
                    'due_date' => $dates['due_date'],
                    'status' => 'pending',
                    'paid_amount' => 0,
                    'remaining_amount' => $feeStructure->amount,
                    'notes' => "Auto-assigned from fee structure: {$feeStructure->name}",
                ]);

                $this->command->info("    ✓ Created fee assignment for student admission ID: {$admission->id} (Amount: {$feeStructure->amount})");
                $totalCreated++;
            }
        }

        $this->command->info("✅ Fee assignments seeded successfully!");
        $this->command->info("  → Created: {$totalCreated} assignment(s)");
        if ($totalSkipped > 0) {
            $this->command->info("  → Skipped: {$totalSkipped} assignment(s) (already exist)");
        }
    }

    /**
     * Find student admissions that match a fee structure
     */
    protected function findMatchingAdmissions(FeeStructure $feeStructure)
    {
        $query = StudentAdmission::whereNull('deleted_at')
            ->where('organization_id', $feeStructure->organization_id)
            ->where('school_id', $feeStructure->school_id)
            ->where('academic_year_id', $feeStructure->academic_year_id);

        // Match by class_academic_year_id if available
        if ($feeStructure->class_academic_year_id) {
            $query->where('class_academic_year_id', $feeStructure->class_academic_year_id);
        } elseif ($feeStructure->class_id) {
            // Fallback to class_id if class_academic_year_id is not set
            $query->where('class_id', $feeStructure->class_id);
        }

        // Only include active admissions
        $query->whereIn('enrollment_status', ['admitted', 'active']);

        return $query->get();
    }

    /**
     * Calculate payment period and due dates based on fee type
     */
    protected function calculateDates(FeeStructure $feeStructure, StudentAdmission $admission): array
    {
        $academicYear = $feeStructure->academicYear;
        $admissionDate = $admission->admission_date ?? Carbon::now();

        $periodStart = null;
        $periodEnd = null;
        $dueDate = null;

        // Use fee structure dates if available
        if ($feeStructure->start_date && $feeStructure->end_date) {
            $periodStart = Carbon::parse($feeStructure->start_date);
            $periodEnd = Carbon::parse($feeStructure->end_date);
        } elseif ($academicYear) {
            // Use academic year dates as fallback
            $periodStart = $academicYear->start_date ? Carbon::parse($academicYear->start_date) : null;
            $periodEnd = $academicYear->end_date ? Carbon::parse($academicYear->end_date) : null;
        }

        // Calculate due date based on fee type
        if ($feeStructure->due_date) {
            $dueDate = Carbon::parse($feeStructure->due_date);
        } else {
            switch ($feeStructure->fee_type) {
                case 'one_time':
                    // One-time fees are due 30 days after admission
                    $dueDate = $admissionDate->copy()->addDays(30);
                    break;

                case 'monthly':
                    // Monthly fees are due on the 1st of the next month
                    $dueDate = Carbon::now()->startOfMonth()->addMonth();
                    break;

                case 'semester':
                    // Semester fees are due 2 weeks after semester start
                    if ($periodStart) {
                        $dueDate = $periodStart->copy()->addWeeks(2);
                    } else {
                        $dueDate = $admissionDate->copy()->addWeeks(2);
                    }
                    break;

                case 'annual':
                    // Annual fees are due 1 month after academic year start
                    if ($periodStart) {
                        $dueDate = $periodStart->copy()->addMonth();
                    } else {
                        $dueDate = $admissionDate->copy()->addMonth();
                    }
                    break;

                default:
                    // Default: due 30 days from now
                    $dueDate = Carbon::now()->addDays(30);
                    break;
            }
        }

        return [
            'period_start' => $periodStart,
            'period_end' => $periodEnd,
            'due_date' => $dueDate,
        ];
    }
}

