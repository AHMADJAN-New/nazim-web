<?php

namespace App\Console\Commands;

use App\Models\StudentAdmission;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class SoftDeleteOrphanedAdmissionsCommand extends Command
{
    protected $signature = 'admissions:soft-delete-orphaned
                            {--organization-id= : Only process admissions for this organization UUID}
                            {--dry-run : Show how many orphaned admissions would be soft-deleted without changing data}';

    protected $description = 'Soft-delete student_admissions whose related student is soft-deleted or missing';

    public function handle(): int
    {
        $organizationId = $this->option('organization-id')
            ? trim((string) $this->option('organization-id'))
            : '';
        $dryRun = (bool) $this->option('dry-run');

        if ($organizationId !== '' && ! Str::isUuid($organizationId)) {
            $this->error('--organization-id must be a valid UUID.');

            return self::FAILURE;
        }

        // SoftDeletes on Student means whereDoesntHave('student') matches both
        // soft-deleted and hard-missing student rows.
        $query = StudentAdmission::query()
            ->whereNull('deleted_at')
            ->whereDoesntHave('student');

        if ($organizationId !== '') {
            $query->where('organization_id', $organizationId);
        }

        $count = (clone $query)->count();

        if ($count === 0) {
            $this->info('No orphaned admissions found.');

            return self::SUCCESS;
        }

        if ($dryRun) {
            $this->warn("DRY RUN: would soft-delete {$count} orphaned admission(s).");

            return self::SUCCESS;
        }

        $deleted = 0;
        $query->orderBy('id')->chunkById(100, function ($admissions) use (&$deleted) {
            foreach ($admissions as $admission) {
                $admission->delete();
                $deleted++;
            }
        });

        $this->info("Soft-deleted {$deleted} orphaned admission(s).");

        return self::SUCCESS;
    }
}
