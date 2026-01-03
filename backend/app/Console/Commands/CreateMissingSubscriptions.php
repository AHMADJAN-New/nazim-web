<?php

namespace App\Console\Commands;

use App\Models\Organization;
use App\Services\Subscription\SubscriptionService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CreateMissingSubscriptions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'subscriptions:create-missing 
                            {--dry-run : Show what would be created without actually creating}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create trial subscriptions for organizations that do not have one';

    public function __construct(
        private SubscriptionService $subscriptionService
    ) {
        parent::__construct();
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Checking for organizations without subscriptions...');

        // Get all organizations without active subscriptions
        $organizationsWithoutSubscriptions = DB::table('organizations')
            ->whereNull('deleted_at')
            ->whereNotIn('id', function ($query) {
                $query->select('organization_id')
                    ->from('organization_subscriptions')
                    ->whereNull('deleted_at');
            })
            ->get();

        if ($organizationsWithoutSubscriptions->isEmpty()) {
            $this->info('✓ All organizations already have subscriptions.');
            return Command::SUCCESS;
        }

        $this->info("Found {$organizationsWithoutSubscriptions->count()} organization(s) without subscriptions.");

        if ($this->option('dry-run')) {
            $this->warn('DRY RUN MODE - No subscriptions will be created.');
            foreach ($organizationsWithoutSubscriptions as $org) {
                $this->line("  - Would create subscription for: {$org->name} (ID: {$org->id})");
            }
            return Command::SUCCESS;
        }

        $created = 0;
        $failed = 0;

        foreach ($organizationsWithoutSubscriptions as $org) {
            try {
                $this->subscriptionService->createTrialSubscription($org->id);
                $this->info("✓ Created trial subscription for: {$org->name}");
                $created++;
            } catch (\Exception $e) {
                $this->error("✗ Failed to create subscription for {$org->name}: {$e->getMessage()}");
                $failed++;
            }
        }

        $this->newLine();
        $this->info("Summary:");
        $this->info("  Created: {$created}");
        if ($failed > 0) {
            $this->warn("  Failed: {$failed}");
        }

        return $failed > 0 ? Command::FAILURE : Command::SUCCESS;
    }
}





