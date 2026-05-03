<?php

namespace App\Console\Commands;

use App\Services\IdCards\SyncStudentIdCardClassFromAdmissionService;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class SyncStudentIdCardClassFromAdmissionsCommand extends Command
{
    protected $signature = 'student-id-cards:sync-class-from-admissions
                            {--organization-id= : organizations.id — limit scope}
                            {--school-id= : school_branding.id — limit scope}
                            {--student-id= : students.id — only cards for this student}
                            {--all : Every org/school — use with --dry-run (preview) or --force (apply)}
                            {--chunk=200 : Chunk size for processing}
                            {--dry-run : Report mismatches without writing}
                            {--force : Skip confirmation when not dry-run}';

    protected $description = 'Align student_id_cards.class_id / class_academic_year_id with student_admissions for the same academic year; clears print flags when updated';

    public function handle(SyncStudentIdCardClassFromAdmissionService $service): int
    {
        $all = (bool) $this->option('all');
        $organizationId = $this->option('organization-id') ? trim((string) $this->option('organization-id')) : null;
        $schoolId = $this->option('school-id') ? trim((string) $this->option('school-id')) : null;
        $studentId = $this->option('student-id') ? trim((string) $this->option('student-id')) : null;
        $chunk = (int) $this->option('chunk');
        $dryRun = (bool) $this->option('dry-run');

        if ($all && ! $dryRun && ! $this->option('force')) {
            $this->error('With --all: add --dry-run to preview only, or --force to apply fixes across the whole database.');
            $this->line('  Preview: php artisan student-id-cards:sync-class-from-admissions --all --dry-run');
            $this->line('  Apply:   php artisan student-id-cards:sync-class-from-admissions --all --force');

            return self::FAILURE;
        }

        if ($all && (($organizationId !== null && $organizationId !== '')
            || ($schoolId !== null && $schoolId !== '')
            || ($studentId !== null && $studentId !== ''))) {
            $this->error('Do not combine --all with --organization-id, --school-id, or --student-id.');

            return self::FAILURE;
        }

        if ($organizationId !== null && $organizationId !== '' && ! Str::isUuid($organizationId)) {
            $this->error('--organization-id must be a valid UUID.');

            return self::FAILURE;
        }
        if ($schoolId !== null && $schoolId !== '' && ! Str::isUuid($schoolId)) {
            $this->error('--school-id must be a valid UUID.');

            return self::FAILURE;
        }
        if ($studentId !== null && $studentId !== '' && ! Str::isUuid($studentId)) {
            $this->error('--student-id must be a valid UUID.');

            return self::FAILURE;
        }

        if ($organizationId === '') {
            $organizationId = null;
        }
        if ($schoolId === '') {
            $schoolId = null;
        }
        if ($studentId === '') {
            $studentId = null;
        }

        if (! $all && $organizationId === null && $schoolId === null && $studentId === null) {
            $this->error('Provide --all with --dry-run or --force, or one of --organization-id, --school-id, or --student-id.');

            return self::FAILURE;
        }

        if ($all) {
            $organizationId = null;
            $schoolId = null;
            $studentId = null;
            if ($dryRun) {
                $this->info('Full-system dry run: scanning all student_id_cards (no writes).');
            } else {
                $this->warn('Full-system apply: updating every mismatched student_id_cards row in the database.');
            }
        }

        $this->info('Scanning student_id_cards for class / section mismatches vs student_admissions…');

        if (! $dryRun) {
            $this->warn('This will update student_id_cards and clear is_printed / printed_at / printed_by for corrected rows.');
            if (! $this->option('force') && ! $this->confirm('Continue?', true)) {
                $this->warn('Aborted.');

                return self::FAILURE;
            }
        }

        $result = $service->backfillMisalignedCards(
            $organizationId,
            $schoolId,
            $studentId,
            $dryRun,
            $chunk > 0 ? $chunk : 200
        );

        $wouldOrDid = $dryRun ? (string) $result['mismatched'] : (string) $result['updated'];

        $this->table(
            ['Metric', 'Count'],
            [
                ['Cards scanned', (string) $result['scanned']],
                ['Mismatched (card ≠ admission)', (string) $result['mismatched']],
                [$dryRun ? 'Would update (dry-run)' : 'Updated', $wouldOrDid],
            ]
        );

        return self::SUCCESS;
    }
}
