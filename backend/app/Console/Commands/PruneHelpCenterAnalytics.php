<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Config;

class PruneHelpCenterAnalytics extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'help-center:prune-analytics 
                            {--days=180 : Number of days to retain analytics data}
                            {--dry-run : Show what would be deleted without actually deleting}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Prune old help center analytics data (views and votes)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $retentionDays = (int) $this->option('days');
        $dryRun = $this->option('dry-run');
        $cutoffDate = now()->subDays($retentionDays)->toDateString();

        $this->info("Pruning help center analytics data older than {$retentionDays} days (before {$cutoffDate})");

        // Count records to be deleted
        $viewsCount = DB::table('help_center_article_views')
            ->where('view_date', '<', $cutoffDate)
            ->count();

        $votesCount = DB::table('help_center_article_votes')
            ->where('created_at', '<', $cutoffDate)
            ->count();

        $this->info("Found {$viewsCount} view records and {$votesCount} vote records to prune");

        if ($dryRun) {
            $this->warn('DRY RUN: No data will be deleted');
            return Command::SUCCESS;
        }

        if ($viewsCount > 0 || $votesCount > 0) {
            if (!$this->confirm("Delete {$viewsCount} view records and {$votesCount} vote records?")) {
                $this->info('Operation cancelled');
                return Command::SUCCESS;
            }
        }

        // Delete old view records
        if ($viewsCount > 0) {
            $deletedViews = DB::table('help_center_article_views')
                ->where('view_date', '<', $cutoffDate)
                ->delete();
            $this->info("Deleted {$deletedViews} view records");
        }

        // Delete old vote records
        if ($votesCount > 0) {
            $deletedVotes = DB::table('help_center_article_votes')
                ->where('created_at', '<', $cutoffDate)
                ->delete();
            $this->info("Deleted {$deletedVotes} vote records");
        }

        $this->info('Analytics pruning completed successfully');

        return Command::SUCCESS;
    }
}
