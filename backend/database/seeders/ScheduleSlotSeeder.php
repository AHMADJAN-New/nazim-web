<?php

namespace Database\Seeders;

use App\Models\ScheduleSlot;
use App\Models\AcademicYear;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ScheduleSlotSeeder extends Seeder
{
    /**
     * Seed the schedule_slots table.
     *
     * Creates 6 periods (schedule slots) for each organization:
     * - Each period is 45 minutes
     * - Available on 6 days: Monday, Tuesday, Wednesday, Thursday, Saturday, Sunday (excluding Friday)
     * - Each period is assigned to all academic years for the organization
     */
    public function run(): void
    {
        $this->command->info('Seeding schedule slots...');

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
            $this->command->info("Creating schedule slots for {$organization->name}...");

            // Get all academic years for this organization
            $academicYears = AcademicYear::where('organization_id', $organization->id)
                ->whereNull('deleted_at')
                ->get();

            if ($academicYears->isEmpty()) {
                $this->command->warn("  ⚠ No academic years found for {$organization->name}. Skipping schedule slot creation.");
                continue;
            }

            $created = $this->createScheduleSlotsForOrganization(
                $organization->id,
                $academicYears
            );
            $totalCreated += $created;

            $this->command->info("  → Created {$created} schedule slot(s) for {$organization->name}");
        }

        $this->command->info("✅ Schedule slot seeding completed. Total created: {$totalCreated}");
    }

    /**
     * Create schedule slots for an organization
     */
    protected function createScheduleSlotsForOrganization(
        string $organizationId,
        $academicYears
    ): int {
        $created = 0;

        // Define 6 periods with start times (each 45 minutes)
        // Period 1: 08:00 - 08:45
        // Period 2: 08:45 - 09:30
        // Period 3: 09:30 - 10:15
        // Period 4: 10:15 - 11:00
        // Period 5: 11:00 - 11:45
        // Period 6: 11:45 - 12:30
        $periods = [
            [
                'name' => 'Period 1',
                'code' => 'P1',
                'start_time' => '08:00:00',
                'end_time' => '08:45:00',
                'sort_order' => 1,
            ],
            [
                'name' => 'Period 2',
                'code' => 'P2',
                'start_time' => '08:45:00',
                'end_time' => '09:30:00',
                'sort_order' => 2,
            ],
            [
                'name' => 'Period 3',
                'code' => 'P3',
                'start_time' => '09:30:00',
                'end_time' => '10:15:00',
                'sort_order' => 3,
            ],
            [
                'name' => 'Period 4',
                'code' => 'P4',
                'start_time' => '10:15:00',
                'end_time' => '11:00:00',
                'sort_order' => 4,
            ],
            [
                'name' => 'Period 5',
                'code' => 'P5',
                'start_time' => '11:00:00',
                'end_time' => '11:45:00',
                'sort_order' => 5,
            ],
            [
                'name' => 'Period 6',
                'code' => 'P6',
                'start_time' => '11:45:00',
                'end_time' => '12:30:00',
                'sort_order' => 6,
            ],
        ];

        // Days of week: Monday, Tuesday, Wednesday, Thursday, Saturday, Sunday (excluding Friday)
        $daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'saturday', 'sunday'];

        // Create each period for each academic year
        foreach ($periods as $period) {
            foreach ($academicYears as $academicYear) {
                // Check if schedule slot already exists
                $exists = DB::table('schedule_slots')
                    ->where('organization_id', $organizationId)
                    ->where('academic_year_id', $academicYear->id)
                    ->where('code', $period['code'])
                    ->whereNull('deleted_at')
                    ->exists();

                if ($exists) {
                    $this->command->info("  ⚠ Schedule slot {$period['code']} already exists for academic year {$academicYear->name}. Skipping.");
                    continue;
                }

                // Create schedule slot
                $slotId = (string) Str::uuid();
                
                DB::table('schedule_slots')->insert([
                    'id' => $slotId,
                    'organization_id' => $organizationId,
                    'name' => $period['name'],
                    'code' => $period['code'],
                    'start_time' => $period['start_time'],
                    'end_time' => $period['end_time'],
                    'days_of_week' => json_encode($daysOfWeek),
                    'default_duration_minutes' => 45,
                    'academic_year_id' => $academicYear->id,
                    'school_id' => null, // Organization-wide
                    'sort_order' => $period['sort_order'],
                    'is_active' => true,
                    'description' => "Period {$period['sort_order']} - {$period['start_time']} to {$period['end_time']}",
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $created++;
                $this->command->info("  ✓ Created schedule slot: {$period['name']} ({$period['code']}) for {$academicYear->name}");
            }
        }

        return $created;
    }
}
