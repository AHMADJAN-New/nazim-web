<?php

namespace App\Console\Commands;

use App\Models\Organization;
use App\Services\Subscription\UsageTrackingService;
use Illuminate\Console\Command;

class CreateUsageSnapshots extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'subscription:create-snapshots';

    /**
     * The console command description.
     */
    protected $description = 'Create usage snapshots for all organizations';

    public function __construct(
        private UsageTrackingService $usageTrackingService
    ) {
        parent::__construct();
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Creating usage snapshots for all organizations...');

        $organizations = Organization::whereNull('deleted_at')->get();
        $count = 0;

        foreach ($organizations as $organization) {
            try {
                // Recalculate usage first
                $this->usageTrackingService->recalculateUsage($organization->id);

                // Create snapshot
                $this->usageTrackingService->createSnapshot($organization->id);

                $count++;
                $this->line("  ✓ Created snapshot for: {$organization->name}");
            } catch (\Exception $e) {
                $this->error("  ✗ Failed for {$organization->name}: {$e->getMessage()}");
            }
        }

        $this->newLine();
        $this->info("Created {$count} usage snapshots.");

        return Command::SUCCESS;
    }
}
