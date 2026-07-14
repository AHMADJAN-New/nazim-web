<?php

namespace App\Console\Commands;

use App\Models\ExamStudent;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class SoftDeleteOrphanedExamStudentsCommand extends Command
{
    protected $signature = 'exam-students:soft-delete-orphaned
                            {--organization-id= : Only process exam enrollments for this organization UUID}
                            {--dry-run : Show how many orphaned enrollments would be soft-deleted without changing data}';

    protected $description = 'Soft-delete exam_students whose related admission/student is soft-deleted or missing';

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

        // SoftDeletes on StudentAdmission/Student means whereDoesntHave matches
        // soft-deleted and hard-missing relations.
        $query = ExamStudent::query()
            ->whereNull('deleted_at')
            ->where(function ($q) {
                $q->whereDoesntHave('studentAdmission')
                    ->orWhereHas('studentAdmission', function ($admissionQuery) {
                        $admissionQuery->whereDoesntHave('student');
                    });
            });

        if ($organizationId !== '') {
            $query->where('organization_id', $organizationId);
        }

        $count = (clone $query)->count();

        if ($count === 0) {
            $this->info('No orphaned exam enrollments found.');

            return self::SUCCESS;
        }

        if ($dryRun) {
            $this->warn("DRY RUN: would soft-delete {$count} orphaned exam enrollment(s).");

            return self::SUCCESS;
        }

        $deleted = 0;
        $query->orderBy('id')->chunkById(100, function ($examStudents) use (&$deleted) {
            foreach ($examStudents as $examStudent) {
                $examStudent->delete();
                $deleted++;
            }
        });

        $this->info("Soft-deleted {$deleted} orphaned exam enrollment(s).");

        return self::SUCCESS;
    }
}
