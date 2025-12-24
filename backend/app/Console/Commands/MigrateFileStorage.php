<?php

namespace App\Console\Commands;

use App\Services\Storage\FileMigrationService;
use Illuminate\Console\Command;

class MigrateFileStorage extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'storage:migrate
                            {--dry-run : Show what would be migrated without making changes}
                            {--resource= : Migrate specific resource type (students, staff, courses, dms, id_card_templates, certificate_templates)}
                            {--organization= : Migrate files for a specific organization ID only}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migrate existing files to the new standardized folder structure';

    public function __construct(
        private FileMigrationService $migrationService
    ) {
        parent::__construct();
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        $resource = $this->option('resource');
        $organizationId = $this->option('organization');

        if ($dryRun) {
            $this->info('DRY RUN MODE - No files will be moved');
            $this->newLine();
        }

        $this->info('Starting file storage migration...');
        $this->newLine();

        if ($organizationId) {
            $this->info("Filtering by organization: {$organizationId}");
            $this->newLine();
        }

        $totalMigrated = 0;
        $totalFailed = 0;
        $totalSkipped = 0;
        $allErrors = [];

        if ($resource) {
            // Migrate specific resource type
            $result = $this->migrateResourceType($resource, $dryRun, $organizationId);
            if ($result) {
                $this->displayResults($resource, $result);
                $totalMigrated += $result['migrated'];
                $totalFailed += $result['failed'];
                $totalSkipped += $result['skipped'];
                $allErrors = array_merge($allErrors, $result['errors']);
            }
        } else {
            // Migrate all resource types
            $resourceTypes = [
                'students' => 'Student files (pictures & documents)',
                'staff' => 'Staff files (pictures & documents)',
                'courses' => 'Course documents',
                'dms' => 'DMS document files',
                'id_card_templates' => 'ID card templates',
                'certificate_templates' => 'Certificate templates',
            ];

            foreach ($resourceTypes as $type => $description) {
                $this->info("Migrating: {$description}");
                $result = $this->migrateResourceType($type, $dryRun, $organizationId);

                if ($result) {
                    $this->displayResults($type, $result);
                    $totalMigrated += $result['migrated'];
                    $totalFailed += $result['failed'];
                    $totalSkipped += $result['skipped'];
                    $allErrors = array_merge($allErrors, $result['errors']);
                }
                $this->newLine();
            }
        }

        // Summary
        $this->newLine();
        $this->info('=== Migration Summary ===');
        $this->table(
            ['Metric', 'Count'],
            [
                ['Migrated', $totalMigrated],
                ['Skipped (already migrated)', $totalSkipped],
                ['Failed', $totalFailed],
            ]
        );

        if (!empty($allErrors)) {
            $this->newLine();
            $this->error('Errors encountered:');
            foreach (array_slice($allErrors, 0, 20) as $error) {
                $this->line("  - {$error}");
            }
            if (count($allErrors) > 20) {
                $this->line("  ... and " . (count($allErrors) - 20) . " more errors");
            }
        }

        if ($dryRun) {
            $this->newLine();
            $this->warn('This was a dry run. Run without --dry-run to apply changes.');
        }

        return $totalFailed > 0 ? Command::FAILURE : Command::SUCCESS;
    }

    /**
     * Migrate a specific resource type
     */
    private function migrateResourceType(string $type, bool $dryRun, ?string $organizationId): ?array
    {
        return match ($type) {
            'students' => $this->migrationService->migrateStudentFiles($dryRun, $organizationId),
            'staff' => $this->migrationService->migrateStaffFiles($dryRun, $organizationId),
            'courses' => $this->migrationService->migrateCourseDocuments($dryRun, $organizationId),
            'dms' => $this->migrationService->migrateDmsFiles($dryRun, $organizationId),
            'id_card_templates' => $this->migrationService->migrateIdCardTemplates($dryRun, $organizationId),
            'certificate_templates' => $this->migrationService->migrateCertificateTemplates($dryRun, $organizationId),
            default => null,
        };
    }

    /**
     * Display results for a resource type
     */
    private function displayResults(string $type, array $result): void
    {
        $this->line("  Migrated: {$result['migrated']}");
        $this->line("  Skipped: {$result['skipped']}");
        if ($result['failed'] > 0) {
            $this->error("  Failed: {$result['failed']}");
        } else {
            $this->line("  Failed: 0");
        }
    }
}
