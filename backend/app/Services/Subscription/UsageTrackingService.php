<?php

namespace App\Services\Subscription;

use App\Models\LimitDefinition;
use App\Models\OrganizationLimitOverride;
use App\Models\OrganizationSubscription;
use App\Models\PlanLimit;
use App\Models\SubscriptionPlan;
use App\Models\UsageCurrent;
use App\Models\UsageSnapshot;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class UsageTrackingService
{
    /**
     * Resource counting queries - maps resource_key to SQL count query
     * CRITICAL: 
     * - All queries using SoftDeletes MUST exclude deleted records (deleted_at IS NULL)
     * - Resources with is_active should only count active records (is_active = true)
     * - Resources without SoftDeletes (like incoming_documents) don't check deleted_at
     */
    private array $countQueries = [
        'students' => "SELECT COUNT(*) as count FROM students WHERE organization_id = :org_id AND deleted_at IS NULL",
        'staff' => "SELECT COUNT(*) as count FROM staff WHERE organization_id = :org_id AND deleted_at IS NULL",
        'users' => "SELECT COUNT(*) as count FROM profiles WHERE organization_id = :org_id AND is_active = true",
        'schools' => "SELECT COUNT(*) as count FROM school_branding WHERE organization_id = :org_id AND deleted_at IS NULL",
        'classes' => "SELECT COUNT(*) as count FROM classes WHERE organization_id = :org_id AND deleted_at IS NULL",
        'documents' => "SELECT COUNT(*) as count FROM incoming_documents WHERE organization_id = :org_id",
        'exams' => "SELECT COUNT(*) as count FROM exams WHERE organization_id = :org_id AND deleted_at IS NULL",
        'finance_accounts' => "SELECT COUNT(*) as count FROM finance_accounts WHERE organization_id = :org_id AND deleted_at IS NULL AND is_active = true",
        'income_entries' => "SELECT COUNT(*) as count FROM income_entries WHERE organization_id = :org_id AND deleted_at IS NULL",
        'expense_entries' => "SELECT COUNT(*) as count FROM expense_entries WHERE organization_id = :org_id AND deleted_at IS NULL",
        'assets' => "SELECT COUNT(*) as count FROM assets WHERE organization_id = :org_id AND deleted_at IS NULL",
        'library_books' => "SELECT COUNT(*) as count FROM library_books WHERE organization_id = :org_id AND deleted_at IS NULL",
        'events' => "SELECT COUNT(*) as count FROM events WHERE organization_id = :org_id AND deleted_at IS NULL",
        'certificate_templates' => "SELECT COUNT(*) as count FROM certificate_templates WHERE organization_id = :org_id AND deleted_at IS NULL",
        'id_card_templates' => "SELECT COUNT(*) as count FROM id_card_templates WHERE organization_id = :org_id AND deleted_at IS NULL",
    ];

    /**
     * Monthly resettable resources
     */
    private array $monthlyResources = [
        'report_exports',
    ];

    /**
     * Yearly resettable resources
     */
    private array $yearlyResources = [
        'exams_yearly',
    ];

    public function __construct(
        private SubscriptionService $subscriptionService
    ) {}

    /**
     * Cache TTL in minutes - how long to trust cached counts before recalculating
     * Set to 5 minutes for balance between performance and accuracy
     */
    public const CACHE_TTL_MINUTES = 5;

    /**
     * Get current usage count for a resource
     * Uses cached counts for performance, with periodic refresh to ensure accuracy
     */
    public function getUsage(string $organizationId, string $resourceKey): float|int
    {
        try {
            // Special handling for storage_gb (returns float in GB)
            if ($resourceKey === 'storage_gb') {
                return $this->getStorageUsage($organizationId);
            }

            // Check if we need to count from database
            if (isset($this->countQueries[$resourceKey])) {
                return $this->getCachedCount($organizationId, $resourceKey);
            }

            // Otherwise, get from usage_current table (for non-database-counted resources)
            $usage = UsageCurrent::where('organization_id', $organizationId)
                ->where('resource_key', $resourceKey)
                ->first();

            if (!$usage) {
                return 0;
            }

            // Check if period needs reset
            try {
                if ($usage->needsPeriodReset()) {
                    $this->resetPeriod($organizationId, $resourceKey);
                    return 0;
                }
            } catch (\Exception $e) {
                \Log::warning("Failed to check/reset period for {$resourceKey}: " . $e->getMessage());
                // Continue and return current count
            }

            return $usage->current_count ?? 0;
        } catch (\Exception $e) {
            \Log::warning("Failed to get usage for resource {$resourceKey} for organization {$organizationId}: " . $e->getMessage());
            return 0; // Return 0 on error
        }
    }

    /**
     * Get cached count with automatic refresh if stale
     * Performance optimization: Uses cached count from usage_current table
     * Refreshes periodically (every 5 minutes) to catch any drift from concurrent operations
     */
    private function getCachedCount(string $organizationId, string $resourceKey): int
    {
        try {
            // Get cached count
            $usage = UsageCurrent::where('organization_id', $organizationId)
                ->where('resource_key', $resourceKey)
                ->first();

            // If no cache exists or cache is stale, recalculate
            $shouldRecalculate = false;
            if (!$usage) {
                $shouldRecalculate = true;
            } elseif ($usage->last_calculated_at === null) {
                $shouldRecalculate = true;
            } else {
                $cacheAge = now()->diffInMinutes($usage->last_calculated_at);
                if ($cacheAge >= self::CACHE_TTL_MINUTES) {
                    $shouldRecalculate = true;
                }
            }

            if ($shouldRecalculate) {
                // Recalculate from database and update cache
                $actualCount = $this->countFromDatabase($organizationId, $resourceKey);
                
                // Update or create cache record
                UsageCurrent::updateOrCreate(
                    [
                        'organization_id' => $organizationId,
                        'resource_key' => $resourceKey,
                    ],
                    [
                        'id' => $usage->id ?? (string) \Illuminate\Support\Str::uuid(),
                        'current_count' => $actualCount,
                        'last_calculated_at' => now(),
                    ]
                );

                return $actualCount;
            }

            // Return cached count
            return $usage->current_count ?? 0;
        } catch (\Exception $e) {
            \Log::warning("Failed to get cached count for {$resourceKey} for org {$organizationId}: " . $e->getMessage());
            // Fallback to direct database count on error
            return $this->countFromDatabase($organizationId, $resourceKey);
        }
    }

    /**
     * Count directly from database using parameterized queries
     * CRITICAL: Always uses fresh database counts to ensure deleted/disabled records are excluded
     */
    private function countFromDatabase(string $organizationId, string $resourceKey): int
    {
        if (!isset($this->countQueries[$resourceKey])) {
            return 0;
        }

        try {
            // Use parameterized query to prevent SQL injection and ensure proper type handling
            $result = DB::select($this->countQueries[$resourceKey], ['org_id' => $organizationId]);
            
            if (empty($result)) {
                return 0;
            }
            
            // Handle both object and array results
            $count = is_object($result[0]) ? ($result[0]->count ?? 0) : ($result[0]['count'] ?? 0);
            
            return (int) $count;
        } catch (\Exception $e) {
            \Log::warning("Failed to count {$resourceKey} for org {$organizationId}: " . $e->getMessage(), [
                'query' => $this->countQueries[$resourceKey],
                'org_id' => $organizationId,
                'trace' => $e->getTraceAsString(),
            ]);
            return 0;
        }
    }

    /**
     * Get the effective limit for a resource (considering overrides)
     * CRITICAL: Checks feature access before returning limit
     */
    public function getLimit(string $organizationId, string $resourceKey): int
    {
        try {
            // Check if feature is enabled for this resource
            $limitFeatureMap = config('subscription_features.limit_feature_map', []);
            $requiredFeature = $limitFeatureMap[$resourceKey] ?? null;

            // If resource requires a feature, check if feature is enabled
            if ($requiredFeature !== null) {
                $requiredFeatures = is_array($requiredFeature) ? $requiredFeature : [$requiredFeature];
                $hasFeature = false;

                // Resolve FeatureGateService from container to avoid circular dependency
                $featureGateService = app(FeatureGateService::class);
                foreach ($requiredFeatures as $featureKey) {
                    if ($featureGateService->hasFeature($organizationId, $featureKey)) {
                        $hasFeature = true;
                        break;
                    }
                }

                // If feature is not enabled, return -1 (disabled) to indicate feature not available
                if (!$hasFeature) {
                    return -1;
                }
            }

            // Check for organization-specific override first
            $override = OrganizationLimitOverride::where('organization_id', $organizationId)
                ->where('resource_key', $resourceKey)
                ->active()
                ->first();

            $subscription = $this->subscriptionService->getCurrentSubscription($organizationId);
            $plan = $subscription?->plan ?? $this->subscriptionService->getCurrentPlan($organizationId);

            if ($subscription && !$subscription->relationLoaded('plan')) {
                $subscription->load('plan');
                $plan = $subscription->plan;
            }

            if (!$plan) {
                return 0; // No plan = no access
            }

            $baseLimit = $override ? $override->limit_value : $plan->getLimit($resourceKey);

            if ($resourceKey === 'schools') {
                $additionalSchools = (int) ($subscription?->additional_schools ?? 0);
                return OrganizationSubscription::calculateTotalSchoolsAllowed($baseLimit, $additionalSchools);
            }

            return $baseLimit;
        } catch (\Exception $e) {
            \Log::warning("Failed to get limit for resource {$resourceKey} for organization {$organizationId}: " . $e->getMessage());
            return -1; // Return unlimited on error to allow access
        }
    }

    /**
     * Get warning threshold for a resource
     */
    public function getWarningThreshold(string $organizationId, string $resourceKey): int
    {
        try {
            $plan = $this->subscriptionService->getCurrentPlan($organizationId);
            
            if (!$plan) {
                return 80; // Default threshold
            }

            try {
                return $plan->getWarningThreshold($resourceKey);
            } catch (\Exception $e) {
                \Log::warning("Failed to get warning threshold from plan for {$resourceKey}: " . $e->getMessage());
                return 80; // Default threshold
            }
        } catch (\Exception $e) {
            \Log::warning("Failed to get warning threshold for {$resourceKey}: " . $e->getMessage());
            return 80; // Default threshold
        }
    }

    /**
     * Check if organization can create a new resource
     * CRITICAL: Checks feature access before limit checks
     */
    public function canCreate(string $organizationId, string $resourceKey): array
    {
        try {
            // Special handling for storage_gb - use storage-specific logic
            if ($resourceKey === 'storage_gb') {
                $currentUsage = $this->getStorageUsage($organizationId);
                $limit = $this->getLimit($organizationId, $resourceKey);

                if ($limit === -1) {
                    return [
                        'allowed' => true,
                        'current' => $currentUsage,
                        'limit' => -1,
                        'remaining' => -1,
                        'percentage' => 0,
                        'warning' => false,
                        'message' => null,
                    ];
                }

                if ($limit === 0) {
                    return [
                        'allowed' => false,
                        'current' => $currentUsage,
                        'limit' => 0,
                        'remaining' => 0,
                        'percentage' => 100,
                        'warning' => false,
                        'message' => 'Storage is not available on your current plan.',
                    ];
                }

                $remaining = max(0, $limit - $currentUsage);
                $percentage = ($limit > 0) ? round(($currentUsage / $limit) * 100, 1) : 0;
                
                $warningThreshold = $this->getWarningThreshold($organizationId, $resourceKey);
                $isWarning = $percentage >= $warningThreshold && $percentage < 100;
                $allowed = $currentUsage < $limit;

                $message = null;
                if (!$allowed) {
                    $message = "You have reached your storage limit ({$limit} GB). Current usage: {$currentUsage} GB. Please upgrade your plan or delete some files.";
                } elseif ($isWarning) {
                    $message = "You are using {$percentage}% of your storage limit ({$currentUsage}/{$limit} GB).";
                }

                return [
                    'allowed' => $allowed,
                    'current' => $currentUsage,
                    'limit' => $limit,
                    'remaining' => $remaining,
                    'percentage' => $percentage,
                    'warning' => $isWarning,
                    'message' => $message,
                ];
            }

            // Check if feature is enabled for this resource before checking limits
            $limitFeatureMap = config('subscription_features.limit_feature_map', []);
            $requiredFeature = $limitFeatureMap[$resourceKey] ?? null;

            // If resource requires a feature, check if feature is enabled
            // Storage doesn't require a feature (it's always available)
            if ($requiredFeature !== null) {
                $requiredFeatures = is_array($requiredFeature) ? $requiredFeature : [$requiredFeature];
                $hasFeature = false;

                // Resolve FeatureGateService from container to avoid circular dependency
                $featureGateService = app(FeatureGateService::class);
                foreach ($requiredFeatures as $featureKey) {
                    if ($featureGateService->hasFeature($organizationId, $featureKey)) {
                        $hasFeature = true;
                        break;
                    }
                }

                // If feature is not enabled, return "feature not available" message
                if (!$hasFeature) {
                    $definition = \App\Models\FeatureDefinition::where('feature_key', $requiredFeatures[0])->first();
                    $featureName = $definition?->name ?? $requiredFeatures[0];
                    
                    return [
                        'allowed' => false,
                        'current' => 0,
                        'limit' => -1,
                        'remaining' => 0,
                        'percentage' => 0,
                        'warning' => false,
                        'message' => "This feature ({$featureName}) is not available on your current plan. Please upgrade to access this feature.",
                    ];
                }
            }

            $currentUsage = $this->getUsage($organizationId, $resourceKey);
            $limit = $this->getLimit($organizationId, $resourceKey);

            // -1 means unlimited (unlimited access) or disabled (feature not available)
            // If limit is -1, check if it's because feature is disabled by verifying again
            // (getLimit returns -1 for both unlimited and disabled, but we already checked feature above)
            if ($limit === -1) {
                // If we got here, feature is enabled (we would have returned earlier if not)
                // So -1 means unlimited
                return [
                    'allowed' => true,
                    'current' => $currentUsage,
                    'limit' => -1,
                    'remaining' => -1,
                    'percentage' => 0,
                    'warning' => false,
                    'message' => null,
                ];
            }

            // 0 means disabled
            if ($limit === 0) {
                return [
                    'allowed' => false,
                    'current' => $currentUsage,
                    'limit' => 0,
                    'remaining' => 0,
                    'percentage' => 100,
                    'warning' => false,
                    'message' => "This feature is not available on your current plan.",
                ];
            }

            $remaining = max(0, $limit - $currentUsage);
            $percentage = ($limit > 0) ? round(($currentUsage / $limit) * 100, 1) : 0;
            
            try {
                $warningThreshold = $this->getWarningThreshold($organizationId, $resourceKey);
            } catch (\Exception $e) {
                \Log::warning("Failed to get warning threshold for {$resourceKey}: " . $e->getMessage());
                $warningThreshold = 80; // Default threshold
            }
            
            $isWarning = $percentage >= $warningThreshold && $percentage < 100;
            $allowed = $currentUsage < $limit;

            $message = null;
            if (!$allowed) {
                $message = "You have reached your {$resourceKey} limit ({$limit}). Please upgrade your plan to add more.";
            } elseif ($isWarning) {
                $message = "You are using {$percentage}% of your {$resourceKey} limit ({$currentUsage}/{$limit}).";
            }

            return [
                'allowed' => $allowed,
                'current' => $currentUsage,
                'limit' => $limit,
                'remaining' => $remaining,
                'percentage' => $percentage,
                'warning' => $isWarning,
                'message' => $message,
            ];
        } catch (\Exception $e) {
            \Log::error("Failed to check canCreate for resource {$resourceKey} for organization {$organizationId}: " . $e->getMessage());
            // Return safe defaults on error
            return [
                'allowed' => true, // Allow on error to prevent blocking
                'current' => 0,
                'limit' => -1,
                'remaining' => -1,
                'percentage' => 0,
                'warning' => false,
                'message' => null,
            ];
        }
    }

    /**
     * Assert that creation is allowed, throws exception if not
     */
    public function assertCanCreate(string $organizationId, string $resourceKey): void
    {
        $check = $this->canCreate($organizationId, $resourceKey);
        
        if (!$check['allowed']) {
            throw new \Exception($check['message'] ?? "Limit reached for {$resourceKey}");
        }
    }

    /**
     * Increment usage count for trackable resources
     */
    public function increment(string $organizationId, string $resourceKey, int $amount = 1): void
    {
        // For database-counted resources, we don't need to track manually
        if (isset($this->countQueries[$resourceKey])) {
            return;
        }

        $usage = $this->getOrCreateUsageRecord($organizationId, $resourceKey);
        $usage->incrementCount($amount);
    }

    /**
     * Decrement usage count for trackable resources
     */
    public function decrement(string $organizationId, string $resourceKey, int $amount = 1): void
    {
        // For database-counted resources, we don't need to track manually
        if (isset($this->countQueries[$resourceKey])) {
            return;
        }

        $usage = UsageCurrent::where('organization_id', $organizationId)
            ->where('resource_key', $resourceKey)
            ->first();

        if ($usage) {
            $usage->decrementCount($amount);
        }
    }

    /**
     * Get or create a usage record
     */
    private function getOrCreateUsageRecord(string $organizationId, string $resourceKey): UsageCurrent
    {
        $usage = UsageCurrent::where('organization_id', $organizationId)
            ->where('resource_key', $resourceKey)
            ->first();

        if (!$usage) {
            $periodStart = null;
            $periodEnd = null;

            // Set period for resettable resources
            if (in_array($resourceKey, $this->monthlyResources)) {
                $periodStart = Carbon::now()->startOfMonth();
                $periodEnd = Carbon::now()->endOfMonth();
            } elseif (in_array($resourceKey, $this->yearlyResources)) {
                $periodStart = Carbon::now()->startOfYear();
                $periodEnd = Carbon::now()->endOfYear();
            }

            $usage = UsageCurrent::create([
                'organization_id' => $organizationId,
                'resource_key' => $resourceKey,
                'current_count' => 0,
                'period_start' => $periodStart,
                'period_end' => $periodEnd,
            ]);
        }

        return $usage;
    }

    /**
     * Reset period for a resource
     */
    private function resetPeriod(string $organizationId, string $resourceKey): void
    {
        $usage = UsageCurrent::where('organization_id', $organizationId)
            ->where('resource_key', $resourceKey)
            ->first();

        if (!$usage) {
            return;
        }

        $periodStart = null;
        $periodEnd = null;

        if (in_array($resourceKey, $this->monthlyResources)) {
            $periodStart = Carbon::now()->startOfMonth();
            $periodEnd = Carbon::now()->endOfMonth();
        } elseif (in_array($resourceKey, $this->yearlyResources)) {
            $periodStart = Carbon::now()->startOfYear();
            $periodEnd = Carbon::now()->endOfYear();
        }

        $usage->update([
            'current_count' => 0,
            'period_start' => $periodStart,
            'period_end' => $periodEnd,
        ]);
    }

    /**
     * Get all usage for an organization
     */
    public function getAllUsage(string $organizationId): array
    {
        $usage = [];
        
        try {
            $limitDefinitions = LimitDefinition::active()->get();

            if ($limitDefinitions->isEmpty()) {
                \Log::warning("No limit definitions found for organization: {$organizationId}");
                return [];
            }

            foreach ($limitDefinitions as $definition) {
                try {
                    $resourceKey = $definition->resource_key;
                    $check = $this->canCreate($organizationId, $resourceKey);
                    
                    $usage[$resourceKey] = [
                        'name' => $definition->name,
                        'description' => $definition->description,
                        'category' => $definition->category,
                        'unit' => $definition->unit,
                        'current' => $check['current'],
                        'limit' => $check['limit'],
                        'remaining' => $check['remaining'],
                        'percentage' => $check['percentage'],
                        'warning' => $check['warning'],
                        'unlimited' => $check['limit'] === -1,
                    ];
                } catch (\Exception $e) {
                    \Log::warning("Failed to get usage for resource {$definition->resource_key}: " . $e->getMessage(), [
                        'trace' => $e->getTraceAsString(),
                    ]);
                    // Continue with next resource - add placeholder entry
                    $usage[$definition->resource_key] = [
                        'name' => $definition->name,
                        'description' => $definition->description,
                        'category' => $definition->category,
                        'unit' => $definition->unit,
                        'current' => 0,
                        'limit' => -1,
                        'remaining' => -1,
                        'percentage' => 0,
                        'warning' => false,
                        'unlimited' => true,
                    ];
                }
            }
        } catch (\Exception $e) {
            \Log::error("Failed to get all usage for organization {$organizationId}: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            // Return empty array instead of throwing to prevent 500 error
            return [];
        }

        return $usage;
    }

    /**
     * Create a usage snapshot for an organization
     */
    public function createSnapshot(string $organizationId): UsageSnapshot
    {
        $subscription = $this->subscriptionService->getCurrentSubscription($organizationId);
        $plan = $subscription?->plan;

        $usageData = [];
        $limitsData = [];

        $limitDefinitions = LimitDefinition::active()->get();

        foreach ($limitDefinitions as $definition) {
            $resourceKey = $definition->resource_key;
            $usageData[$resourceKey] = $this->getUsage($organizationId, $resourceKey);
            $limitsData[$resourceKey] = $this->getLimit($organizationId, $resourceKey);
        }

        return UsageSnapshot::capture(
            $organizationId,
            $plan?->id ?? '',
            $plan?->name ?? 'No Plan',
            $usageData,
            $limitsData
        );
    }

    /**
     * Recalculate all usage counts from database
     * Updated to include storage recalculation
     */
    public function recalculateUsage(string $organizationId): array
    {
        $recalculated = [];

        // Recalculate database-counted resources
        foreach ($this->countQueries as $resourceKey => $query) {
            $count = $this->countFromDatabase($organizationId, $resourceKey);
            $recalculated[$resourceKey] = $count;

            // Update or create usage record
            UsageCurrent::updateOrCreate(
                [
                    'organization_id' => $organizationId,
                    'resource_key' => $resourceKey,
                ],
                [
                    'current_count' => $count,
                    'last_calculated_at' => now(),
                ]
            );
        }

        // Recalculate storage from disk
        $storageUsage = $this->calculateStorageUsage($organizationId);
        $recalculated['storage_gb'] = $storageUsage;

        // Update or create storage usage record
        UsageCurrent::updateOrCreate(
            [
                'organization_id' => $organizationId,
                'resource_key' => 'storage_gb',
            ],
            [
                'current_count' => (int) ($storageUsage * 10000), // Store with 4 decimal precision
                'last_calculated_at' => now(),
            ]
        );

        return $recalculated;
    }

    /**
     * Check if any limit is at warning level
     */
    public function hasWarnings(string $organizationId): array
    {
        $warnings = [];
        
        try {
            $limitDefinitions = LimitDefinition::active()->get();

            if ($limitDefinitions->isEmpty()) {
                return [];
            }

            foreach ($limitDefinitions as $definition) {
                try {
                    $check = $this->canCreate($organizationId, $definition->resource_key);
                    
                    if ($check['warning'] || !$check['allowed']) {
                        $warnings[] = [
                            'resource_key' => $definition->resource_key,
                            'name' => $definition->name,
                            'current' => $check['current'],
                            'limit' => $check['limit'],
                            'percentage' => $check['percentage'],
                            'blocked' => !$check['allowed'],
                        ];
                    }
                } catch (\Exception $e) {
                    \Log::warning("Failed to check warnings for resource {$definition->resource_key}: " . $e->getMessage(), [
                        'trace' => $e->getTraceAsString(),
                    ]);
                    // Continue with next resource
                }
            }
        } catch (\Exception $e) {
            \Log::error("Failed to get warnings for organization {$organizationId}: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            // Return empty array instead of throwing to prevent breaking the API
            return [];
        }

        return $warnings;
    }

    // ==============================================
    // STORAGE USAGE METHODS
    // ==============================================

    /**
     * Calculate total storage usage in GB from disk
     * Scans both private and public disks for organization files
     */
    public function calculateStorageUsage(string $organizationId): float
    {
        try {
            $totalBytes = 0;
            $basePath = "organizations/{$organizationId}";

            // Calculate from private disk
            try {
                $privateFiles = Storage::disk('local')->allFiles($basePath);
                foreach ($privateFiles as $file) {
                    try {
                        $size = Storage::disk('local')->size($file);
                        $totalBytes += $size;
                    } catch (\Exception $e) {
                        \Log::warning("Failed to get size for file {$file}: " . $e->getMessage());
                        // Continue with next file
                    }
                }
            } catch (\Exception $e) {
                \Log::warning("Failed to scan private disk for organization {$organizationId}: " . $e->getMessage());
            }

            // Calculate from public disk
            try {
                $publicFiles = Storage::disk('public')->allFiles($basePath);
                foreach ($publicFiles as $file) {
                    try {
                        $size = Storage::disk('public')->size($file);
                        $totalBytes += $size;
                    } catch (\Exception $e) {
                        \Log::warning("Failed to get size for file {$file}: " . $e->getMessage());
                        // Continue with next file
                    }
                }
            } catch (\Exception $e) {
                \Log::warning("Failed to scan public disk for organization {$organizationId}: " . $e->getMessage());
            }

            // Convert bytes to GB (1 GB = 1,073,741,824 bytes)
            return round($totalBytes / 1073741824, 4);
        } catch (\Exception $e) {
            \Log::error("Failed to calculate storage usage for organization {$organizationId}: " . $e->getMessage());
            return 0.0;
        }
    }

    /**
     * Get storage usage in GB (from cache or calculate from disk)
     */
    public function getStorageUsage(string $organizationId): float
    {
        try {
            // Get from usage_current table (cached)
            $usage = UsageCurrent::where('organization_id', $organizationId)
                ->where('resource_key', 'storage_gb')
                ->first();

            if ($usage && $usage->current_count !== null) {
                // Return cached value (stored as count but represents GB * 10000 for precision)
                return (float) ($usage->current_count / 10000);
            }

            // If not cached, calculate from disk
            $calculatedUsage = $this->calculateStorageUsage($organizationId);

            // Cache the result
            UsageCurrent::updateOrCreate(
                [
                    'organization_id' => $organizationId,
                    'resource_key' => 'storage_gb',
                ],
                [
                    'current_count' => (int) ($calculatedUsage * 10000), // Store with 4 decimal precision as integer
                    'last_calculated_at' => now(),
                ]
            );

            return $calculatedUsage;
        } catch (\Exception $e) {
            \Log::warning("Failed to get storage usage for organization {$organizationId}: " . $e->getMessage());
            return 0.0;
        }
    }

    /**
     * Increment storage usage by file size in GB
     */
    public function incrementStorageUsage(string $organizationId, float $sizeInGB): void
    {
        try {
            $usage = $this->getOrCreateUsageRecord($organizationId, 'storage_gb');
            
            // Convert GB to stored integer format (multiply by 10000 for 4 decimal precision)
            $sizeInStoredFormat = (int) ($sizeInGB * 10000);
            
            $usage->incrementCount($sizeInStoredFormat);
            $usage->update(['last_calculated_at' => now()]);
        } catch (\Exception $e) {
            \Log::error("Failed to increment storage usage for organization {$organizationId}: " . $e->getMessage());
        }
    }

    /**
     * Decrement storage usage by file size in GB
     */
    public function decrementStorageUsage(string $organizationId, float $sizeInGB): void
    {
        try {
            $usage = UsageCurrent::where('organization_id', $organizationId)
                ->where('resource_key', 'storage_gb')
                ->first();

            if ($usage) {
                // Convert GB to stored integer format (multiply by 10000 for 4 decimal precision)
                $sizeInStoredFormat = (int) ($sizeInGB * 10000);
                
                $usage->decrementCount($sizeInStoredFormat);
                $usage->update(['last_calculated_at' => now()]);
            }
        } catch (\Exception $e) {
            \Log::error("Failed to decrement storage usage for organization {$organizationId}: " . $e->getMessage());
        }
    }

    /**
     * Check if file can be stored (checks storage limit)
     */
    public function canStoreFile(string $organizationId, float $fileSizeInGB): array
    {
        try {
            $currentUsage = $this->getStorageUsage($organizationId);
            $limit = $this->getLimit($organizationId, 'storage_gb');

            // -1 means unlimited
            if ($limit === -1) {
                return [
                    'allowed' => true,
                    'current' => $currentUsage,
                    'limit' => -1,
                    'remaining' => -1,
                    'new_usage' => $currentUsage + $fileSizeInGB,
                    'message' => null,
                ];
            }

            // 0 means disabled
            if ($limit === 0) {
                return [
                    'allowed' => false,
                    'current' => $currentUsage,
                    'limit' => 0,
                    'remaining' => 0,
                    'new_usage' => $currentUsage,
                    'message' => 'Storage is not available on your current plan. Please upgrade your plan to upload files.',
                ];
            }

            $newUsage = $currentUsage + $fileSizeInGB;
            $allowed = $newUsage <= $limit;
            $remaining = max(0, $limit - $newUsage);

            $message = null;
            if (!$allowed) {
                $message = "Uploading this file would exceed your storage limit ({$limit} GB). Current usage: " . round($currentUsage, 2) . " GB. File size: " . round($fileSizeInGB, 2) . " GB. Please upgrade your plan or delete some files.";
            }

            return [
                'allowed' => $allowed,
                'current' => $currentUsage,
                'limit' => $limit,
                'remaining' => $remaining,
                'new_usage' => $newUsage,
                'message' => $message,
            ];
        } catch (\Exception $e) {
            \Log::error("Failed to check storage limit for organization {$organizationId}: " . $e->getMessage());
            // Allow on error to prevent blocking
            return [
                'allowed' => true,
                'current' => 0,
                'limit' => -1,
                'remaining' => -1,
                'new_usage' => 0,
                'message' => null,
            ];
        }
    }
}
