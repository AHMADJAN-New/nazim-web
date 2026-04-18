<?php

namespace App\Console\Commands;

use App\Models\Student;
use App\Services\CodeGenerator;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BackfillStudentCodes extends Command
{
    protected $signature = 'students:backfill-student-codes
                            {--school-id= : school_branding.id — only students at this school}
                            {--organization-id= : organizations.id — narrow to this organization}
                            {--dry-run : List all students in scope with current code and proposed ST-* for NULL rows (no DB writes)}
                            {--limit=50000 : Max rows to print in dry-run (0 = no limit)}
                            {--force : Skip confirmation (for scripts / tests)}';

    protected $description = 'Assign missing student_code values (e.g. after Excel import that bypassed Eloquent)';

    public function handle(): int
    {
        $schoolId = $this->option('school-id') ? trim((string) $this->option('school-id')) : '';
        $organizationId = $this->option('organization-id') ? trim((string) $this->option('organization-id')) : '';

        if ($schoolId === '' && $organizationId === '') {
            $this->error('Provide at least one of --school-id or --organization-id.');

            return self::FAILURE;
        }

        if ($schoolId !== '' && ! Str::isUuid($schoolId)) {
            $this->error('--school-id must be a valid UUID.');

            return self::FAILURE;
        }

        if ($organizationId !== '' && ! Str::isUuid($organizationId)) {
            $this->error('--organization-id must be a valid UUID.');

            return self::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');

        $scopeQuery = Student::query()->whereNull('deleted_at');

        if ($schoolId !== '') {
            $scopeQuery->where('school_id', $schoolId);
        }
        if ($organizationId !== '') {
            $scopeQuery->where('organization_id', $organizationId);
        }

        if ($dryRun) {
            return $this->runDryRun($scopeQuery);
        }

        $query = (clone $scopeQuery)->where(function ($q): void {
            $q->whereNull('student_code')->orWhere('student_code', '');
        });

        $count = (clone $query)->count();
        if ($count === 0) {
            $this->info('No students found with NULL student_code for the given scope.');

            return self::SUCCESS;
        }

        $this->info("Found {$count} student(s) with NULL student_code.");

        if (! $this->option('force') && ! $this->confirm("Assign a new student_code to {$count} student(s)?", true)) {
            $this->warn('Aborted.');

            return self::FAILURE;
        }

        $rows = (clone $query)
            ->orderBy('created_at')
            ->orderBy('id')
            ->get(['id', 'organization_id']);

        $updated = 0;
        foreach ($rows->groupBy('organization_id') as $orgId => $group) {
            $orgIdStr = (string) $orgId;
            CodeGenerator::syncStudentCounterFromExistingStudentCodes($orgIdStr);

            foreach ($group->chunk(500) as $chunk) {
                $codes = CodeGenerator::generateStudentCodesBatch($orgIdStr, $chunk->count());
                foreach ($chunk->values() as $i => $row) {
                    DB::table('students')->where('id', $row->id)->update([
                        'student_code' => $codes[$i],
                        'updated_at' => now(),
                    ]);
                    $updated++;
                }
            }
        }

        $this->info("Updated {$updated} student(s). New ST-* numbers follow existing codes in each organization (counters synced; no existing student_code changed).");

        return self::SUCCESS;
    }

    private function runDryRun($scopeQuery): int
    {
        $totalInScope = (clone $scopeQuery)->count();
        if ($totalInScope === 0) {
            $this->info('No students found for the given scope.');

            return self::SUCCESS;
        }

        $limitRaw = (string) ($this->option('limit') ?? '50000');
        $maxList = ($limitRaw === '0') ? null : max(1, (int) $limitRaw);

        $listedQuery = (clone $scopeQuery)->orderBy('created_at')->orderBy('id');
        if ($maxList !== null) {
            $listedQuery->limit($maxList);
        }

        $all = $listedQuery->get(['id', 'admission_no', 'student_code', 'full_name', 'organization_id']);

        if ($maxList !== null && $totalInScope > $maxList) {
            $this->warn("Listing first {$maxList} of {$totalInScope} students. Use --limit=0 for the full list.");
        }

        $codesByOrg = [];
        foreach ($all->pluck('organization_id')->unique()->filter() as $oid) {
            $oidStr = (string) $oid;
            $nullCount = $all->where('organization_id', $oidStr)->filter(fn (Student $s) => $s->student_code === null || $s->student_code === '')->count();
            $codesByOrg[$oidStr] = CodeGenerator::previewStudentCodesAfterSync($oidStr, $nullCount);
        }

        $ptr = [];
        $tableRows = [];
        foreach ($all as $s) {
            $oidStr = (string) $s->organization_id;
            $current = $s->student_code === null || $s->student_code === '' ? '(NULL)' : (string) $s->student_code;
            $proposed = '—';
            if ($s->student_code === null || $s->student_code === '') {
                $i = $ptr[$oidStr] ?? 0;
                $proposed = $codesByOrg[$oidStr][$i] ?? '(error: no preview slot)';
                $ptr[$oidStr] = $i + 1;
            }
            $tableRows[] = [
                (string) ($s->admission_no ?? ''),
                $current,
                $proposed,
                (string) ($s->full_name ?? ''),
            ];
        }

        $this->warn('Dry run — no database changes.');
        $this->table(
            ['admission_no', 'current student_code', 'would assign', 'full_name'],
            $tableRows
        );

        $nullTotal = (clone $scopeQuery)->where(function ($q): void {
            $q->whereNull('student_code')->orWhere('student_code', '');
        })->count();

        $this->newLine();
        $this->info("Rows printed: {$all->count()}. Students in scope (not deleted): {$totalInScope}. With empty student_code (would get a new code on run): {$nullTotal}.");

        return self::SUCCESS;
    }
}
