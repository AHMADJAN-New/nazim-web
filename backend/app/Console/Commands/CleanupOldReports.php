<?php

namespace App\Console\Commands;

use App\Models\ReportRun;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class CleanupOldReports extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'reports:cleanup
                            {--days=7 : Delete reports older than this many days}
                            {--status=* : Only delete reports with these statuses (default: completed, failed)}
                            {--dry-run : Show what would be deleted without actually deleting}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clean up old generated reports and their files';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $days = (int) $this->option('days');
        $statuses = $this->option('status') ?: ['completed', 'failed'];
        $dryRun = $this->option('dry-run');

        $this->info("Cleaning up reports older than {$days} days...");

        if ($dryRun) {
            $this->warn('DRY RUN MODE - No changes will be made');
        }

        $cutoffDate = now()->subDays($days);

        $query = ReportRun::where('created_at', '<', $cutoffDate)
            ->whereIn('status', $statuses);

        $reports = $query->get();

        if ($reports->isEmpty()) {
            $this->info('No old reports found to clean up.');
            return Command::SUCCESS;
        }

        $this->info("Found {$reports->count()} reports to clean up.");

        $deletedCount = 0;
        $filesDeleted = 0;
        $errors = 0;

        $this->withProgressBar($reports, function ($report) use ($dryRun, &$deletedCount, &$filesDeleted, &$errors) {
            try {
                // Delete the file if it exists
                if ($report->file_path && Storage::disk('local')->exists($report->file_path)) {
                    if (!$dryRun) {
                        Storage::disk('local')->delete($report->file_path);
                    }
                    $filesDeleted++;
                }

                // Delete the database record
                if (!$dryRun) {
                    $report->delete();
                }
                $deletedCount++;
            } catch (\Exception $e) {
                $errors++;
                $this->newLine();
                $this->error("Error processing report {$report->id}: {$e->getMessage()}");
            }
        });

        $this->newLine(2);
        $this->info("Summary:");
        $this->line("  - Reports processed: {$deletedCount}");
        $this->line("  - Files deleted: {$filesDeleted}");

        if ($errors > 0) {
            $this->warn("  - Errors: {$errors}");
        }

        if ($dryRun) {
            $this->warn('This was a dry run. Run without --dry-run to actually delete.');
        }

        return $errors > 0 ? Command::FAILURE : Command::SUCCESS;
    }
}
