<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BackfillOrgHrData extends Command
{
    protected $signature = 'org-hr:backfill {--dry-run : Preview only without writing data}';
    protected $description = 'Backfill staff assignments and compensation profiles from legacy staff data';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $staffRows = DB::table('staff')->whereNull('deleted_at')->get();

        $createdAssignments = 0;
        $createdCompProfiles = 0;

        foreach ($staffRows as $staff) {
            $existingAssignment = DB::table('staff_assignments')
                ->where('staff_id', $staff->id)
                ->whereNull('deleted_at')
                ->exists();

            if (!$existingAssignment && $staff->school_id && $staff->organization_id) {
                $assignmentPayload = [
                    'id' => (string) Str::uuid(),
                    'staff_id' => $staff->id,
                    'organization_id' => $staff->organization_id,
                    'school_id' => $staff->school_id,
                    'role_title' => $staff->position,
                    'allocation_percent' => 100,
                    'is_primary' => true,
                    'start_date' => now()->toDateString(),
                    'end_date' => null,
                    'status' => 'active',
                    'notes' => 'Auto-backfilled from legacy staff.school_id',
                    'created_by' => $staff->created_by,
                    'updated_by' => $staff->updated_by,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                if (!$dryRun) {
                    DB::table('staff_assignments')->insert($assignmentPayload);
                }
                $createdAssignments++;
            }

            $existingComp = DB::table('staff_compensation_profiles')
                ->where('staff_id', $staff->id)
                ->whereNull('deleted_at')
                ->exists();

            if (!$existingComp && $staff->organization_id) {
                $legacySalary = trim((string) ($staff->salary ?? ''));
                $parsedAmount = 0;
                $notes = null;

                if ($legacySalary !== '') {
                    if (preg_match('/([0-9]+(?:[\.,][0-9]+)?)/', $legacySalary, $matches) === 1) {
                        $parsedAmount = (float) str_replace(',', '.', $matches[1]);
                    } else {
                        $notes = 'Unable to parse legacy salary: '.$legacySalary;
                    }
                }

                $profilePayload = [
                    'id' => (string) Str::uuid(),
                    'staff_id' => $staff->id,
                    'organization_id' => $staff->organization_id,
                    'base_salary' => $parsedAmount,
                    'pay_frequency' => 'monthly',
                    'currency' => 'AFN',
                    'grade' => null,
                    'step' => null,
                    'effective_from' => now()->toDateString(),
                    'effective_to' => null,
                    'legacy_salary_notes' => $notes,
                    'status' => 'active',
                    'created_by' => $staff->created_by,
                    'updated_by' => $staff->updated_by,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                if (!$dryRun) {
                    DB::table('staff_compensation_profiles')->insert($profilePayload);
                }
                $createdCompProfiles++;
            }
        }

        $this->info('Org HR backfill '.($dryRun ? '(dry-run) ' : '').'completed.');
        $this->line("Assignments created: {$createdAssignments}");
        $this->line("Compensation profiles created: {$createdCompProfiles}");

        return self::SUCCESS;
    }
}
