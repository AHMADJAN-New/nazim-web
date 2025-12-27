<?php

namespace App\Console\Commands;

use App\Services\Storage\FileMigrationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MigrateFileStorage extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'storage:migrate
                            {--dry-run : Show what would be migrated without actually migrating}
                            {--organization= : Migrate files for a specific organization ID}
                            {--resource= : Migrate specific resource type (students, staff, courses, dms, templates, reports)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migrate existing files to new standardized storage structure';

    /**
     * Execute the console command.
     */
    public function handle(FileMigrationService $migrationService): int
    {
        $dryRun = $this->option('dry-run');
        $organizationId = $this->option('organization');
        $resource = $this->option('resource');

        if ($dryRun) {
            $this->info('🔍 DRY RUN MODE - No files will be migrated');
            $this->newLine();
        }

        // Get organizations to migrate
        $organizations = [];
        if ($organizationId) {
            $org = DB::table('organizations')->where('id', $organizationId)->first();
            if (!$org) {
                $this->error("Organization {$organizationId} not found");
                return 1;
            }
            $organizations = [$org];
        } else {
            $organizations = DB::table('organizations')->get();
        }

        if (empty($organizations)) {
            $this->warn('No organizations found to migrate');
            return 0;
        }

        $this->info("Found " . count($organizations) . " organization(s) to migrate");
        $this->newLine();

        $totalMigrated = 0;
        $totalErrors = 0;
        $totalSkipped = 0;

        foreach ($organizations as $org) {
            $this->info("Migrating files for organization: {$org->name} ({$org->id})");
            $this->line(str_repeat('-', 60));

            try {
                if ($resource) {
                    // Migrate specific resource type
                    $results = $this->migrateResource($migrationService, $org->id, $resource, $dryRun);
                    $this->displayResults($resource, $results);
                    $totalMigrated += $results['migrated'];
                    $totalErrors += $results['errors'];
                    $totalSkipped += $results['skipped'];
                } else {
                    // Migrate all resources
                    $results = $migrationService->migrateOrganization($org->id, $dryRun);
                    
                    foreach ($results as $resourceType => $resourceResults) {
                        $this->displayResults($resourceType, $resourceResults);
                        $totalMigrated += $resourceResults['migrated'];
                        $totalErrors += $resourceResults['errors'];
                        $totalSkipped += $resourceResults['skipped'];
                    }
                }
            } catch (\Exception $e) {
                $this->error("Error migrating organization {$org->id}: " . $e->getMessage());
                $totalErrors++;
            }

            $this->newLine();
        }

        // Summary
        $this->newLine();
        $this->info('=== Migration Summary ===');
        $this->table(
            ['Metric', 'Count'],
            [
                ['Migrated', $totalMigrated],
                ['Skipped', $totalSkipped],
                ['Errors', $totalErrors],
            ]
        );

        if ($dryRun) {
            $this->warn('This was a dry run. Run without --dry-run to perform actual migration.');
        }

        return 0;
    }

    /**
     * Migrate specific resource type
     */
    private function migrateResource(FileMigrationService $migrationService, string $organizationId, string $resource, bool $dryRun): array
    {
        return match ($resource) {
            'students' => $migrationService->migrateStudentFiles($organizationId, $dryRun),
            'staff' => $migrationService->migrateStaffFiles($organizationId, $dryRun),
            'courses' => $migrationService->migrateCourseFiles($organizationId, $dryRun),
            'dms' => $migrationService->migrateDmsFiles($organizationId, $dryRun),
            'templates' => $migrationService->migrateTemplateFiles($organizationId, $dryRun),
            'reports' => $migrationService->migrateReportFiles($organizationId, $dryRun),
            default => throw new \InvalidArgumentException("Unknown resource type: {$resource}"),
        };
    }

    /**
     * Display migration results for a resource type
     */
    private function displayResults(string $resourceType, array $results): void
    {
        $icon = $results['errors'] > 0 ? '❌' : ($results['migrated'] > 0 ? '✅' : '⏭️');
        $this->line("{$icon} {$resourceType}:");
        $this->line("   Migrated: {$results['migrated']}");
        $this->line("   Skipped: {$results['skipped']}");
        if ($results['errors'] > 0) {
            $this->error("   Errors: {$results['errors']}");
        }
    }
}
