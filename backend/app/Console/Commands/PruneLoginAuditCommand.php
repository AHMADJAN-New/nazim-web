<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class PruneLoginAuditCommand extends Command
{
    protected $signature = 'login-audit:prune
                            {--days= : Override retention days (default from config)}
                            {--dry-run : Show what would be deleted without actually deleting}';

    protected $description = 'Prune old login attempts and resolved lockouts based on retention days';

    public function handle(): int
    {
        $retentionDays = (int) ($this->option('days') ?? config('login.audit_retention_days', 90));
        $dryRun = $this->option('dry-run');
        $cutoff = now()->subDays($retentionDays)->toDateString();

        $this->info("Pruning login audit data older than {$retentionDays} days (before {$cutoff})");

        $attemptsCount = DB::table('nazim_logs.login_attempts')
            ->where('attempted_at', '<', $cutoff)
            ->count();

        $lockoutsCount = DB::table('nazim_logs.login_lockouts')
            ->whereNotNull('unlocked_at')
            ->where('unlocked_at', '<', $cutoff)
            ->count();

        $this->info("Found {$attemptsCount} login attempts and {$lockoutsCount} resolved lockouts to prune");

        if ($dryRun) {
            $this->warn('DRY RUN: No data will be deleted');
            return Command::SUCCESS;
        }

        $deletedAttempts = DB::table('nazim_logs.login_attempts')
            ->where('attempted_at', '<', $cutoff)
            ->delete();

        $deletedLockouts = DB::table('nazim_logs.login_lockouts')
            ->whereNotNull('unlocked_at')
            ->where('unlocked_at', '<', $cutoff)
            ->delete();

        $this->info("Deleted {$deletedAttempts} login attempts and {$deletedLockouts} lockout records");
        $this->info('Login audit pruning completed successfully');

        return Command::SUCCESS;
    }
}
