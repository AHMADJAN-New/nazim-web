<?php

namespace App\Console\Commands;

use App\Services\Subscription\UsageTrackingService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Command to periodically recalculate usage counts from database
 * This ensures counts stay accurate even with concurrent operations
 * 
 * Run this via scheduler: every 15 minutes
 * php artisan usage:recalculate
 */
class RecalculateUsageCounts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'usage:recalculate 
                            {--org= : Specific organization ID to recalculate}
                            {--resource= : Specific resource key to recalculate}
                            {--force : Force recalculation even if cache is fresh}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Recalculate usage counts from database to ensure accuracy';

    /**
     * Execute the console command.
     */
    public function handle(UsageTrackingService $usageService): int
    {
        $this->info('Starting usage count recalculation...');

        try {
            $orgId = $this->option('org');
            $resourceKey = $this->option('resource');
            $force = $this->option('force');

            if ($orgId) {
                // Recalculate for specific organization
                $this->recalculateOrganization($usageService, $orgId, $resourceKey, $force);
            } else {
                // Recalculate for all organizations
                $this->recalculateAll($usageService, $resourceKey, $force);
            }

            $this->info('Usage count recalculation completed successfully.');
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Failed to recalculate usage counts: ' . $e->getMessage());
            Log::error('Usage recalculation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return Command::FAILURE;
        }
    }

    /**
     * Recalculate for a specific organization
     */
    private function recalculateOrganization(
        UsageTrackingService $usageService,
        string $orgId,
        ?string $resourceKey,
        bool $force
    ): void {
        $this->info("Recalculating for organization: {$orgId}");

        if ($resourceKey) {
            $this->recalculateResource($usageService, $orgId, $resourceKey, $force);
        } else {
            $recalculated = $usageService->recalculateUsage($orgId);
            $this->info("Recalculated " . count($recalculated) . " resources for organization {$orgId}");
        }
    }

    /**
     * Recalculate for all organizations
     */
    private function recalculateAll(UsageTrackingService $usageService, ?string $resourceKey, bool $force): void
    {
        // Get all organizations
        $organizations = DB::table('organizations')
            ->whereNull('deleted_at')
            ->pluck('id');

        $total = $organizations->count();
        $this->info("Recalculating for {$total} organizations...");

        $bar = $this->output->createProgressBar($total);
        $bar->start();

        foreach ($organizations as $orgId) {
            try {
                if ($resourceKey) {
                    $this->recalculateResource($usageService, $orgId, $resourceKey, $force);
                } else {
                    $usageService->recalculateUsage($orgId);
                }
            } catch (\Exception $e) {
                Log::warning("Failed to recalculate usage for organization {$orgId}: " . $e->getMessage());
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
    }

    /**
     * Recalculate a specific resource for an organization
     */
    private function recalculateResource(
        UsageTrackingService $usageService,
        string $orgId,
        string $resourceKey,
        bool $force
    ): void {
        // Get usage record
        $usage = \App\Models\UsageCurrent::where('organization_id', $orgId)
            ->where('resource_key', $resourceKey)
            ->first();

        // Skip if cache is fresh and not forcing
        if (!$force && $usage && $usage->last_calculated_at) {
            $cacheAge = now()->diffInMinutes($usage->last_calculated_at);
            if ($cacheAge < 5) { // 5 minutes cache TTL
                return; // Cache is still fresh
            }
        }

        // Recalculate
        $actualCount = $usageService->getUsage($orgId, $resourceKey);
        
        \App\Models\UsageCurrent::updateOrCreate(
            [
                'organization_id' => $orgId,
                'resource_key' => $resourceKey,
            ],
            [
                'id' => $usage->id ?? (string) \Illuminate\Support\Str::uuid(),
                'current_count' => $actualCount,
                'last_calculated_at' => now(),
            ]
        );
    }
}

