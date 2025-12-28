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

class UsageTrackingService
{
    /**
     * Resource counting queries - maps resource_key to SQL count query
     */
    private array $countQueries = [
        'students' => "SELECT COUNT(*) FROM students WHERE organization_id = :org_id AND deleted_at IS NULL",
        'staff' => "SELECT COUNT(*) FROM staff WHERE organization_id = :org_id AND deleted_at IS NULL",
        'users' => "SELECT COUNT(*) FROM profiles WHERE organization_id = :org_id AND is_active = true",
        'schools' => "SELECT COUNT(*) FROM school_branding WHERE organization_id = :org_id AND deleted_at IS NULL",
        'classes' => "SELECT COUNT(*) FROM classes WHERE organization_id = :org_id AND deleted_at IS NULL",
        'documents' => "SELECT COUNT(*) FROM incoming_documents WHERE organization_id = :org_id AND deleted_at IS NULL",
        'exams' => "SELECT COUNT(*) FROM exams WHERE organization_id = :org_id AND deleted_at IS NULL",
        'finance_accounts' => "SELECT COUNT(*) FROM finance_accounts WHERE organization_id = :org_id AND deleted_at IS NULL",
        'income_entries' => "SELECT COUNT(*) FROM income_entries WHERE organization_id = :org_id AND deleted_at IS NULL",
        'expense_entries' => "SELECT COUNT(*) FROM expense_entries WHERE organization_id = :org_id AND deleted_at IS NULL",
        'assets' => "SELECT COUNT(*) FROM assets WHERE organization_id = :org_id AND deleted_at IS NULL",
        'library_books' => "SELECT COUNT(*) FROM library_books WHERE organization_id = :org_id AND deleted_at IS NULL",
        'events' => "SELECT COUNT(*) FROM events WHERE organization_id = :org_id AND deleted_at IS NULL",
        'certificate_templates' => "SELECT COUNT(*) FROM certificate_templates WHERE organization_id = :org_id AND deleted_at IS NULL",
        'id_card_templates' => "SELECT COUNT(*) FROM id_card_templates WHERE organization_id = :org_id AND deleted_at IS NULL",
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
     * Get current usage count for a resource
     */
    public function getUsage(string $organizationId, string $resourceKey): int
    {
        // Check if we need to count from database
        if (isset($this->countQueries[$resourceKey])) {
            return $this->countFromDatabase($organizationId, $resourceKey);
        }

        // Otherwise, get from usage_current table
        $usage = UsageCurrent::where('organization_id', $organizationId)
            ->where('resource_key', $resourceKey)
            ->first();

        if (!$usage) {
            return 0;
        }

        // Check if period needs reset
        if ($usage->needsPeriodReset()) {
            $this->resetPeriod($organizationId, $resourceKey);
            return 0;
        }

        return $usage->current_count;
    }

    /**
     * Count directly from database
     */
    private function countFromDatabase(string $organizationId, string $resourceKey): int
    {
        if (!isset($this->countQueries[$resourceKey])) {
            return 0;
        }

        $query = str_replace(':org_id', "'" . $organizationId . "'", $this->countQueries[$resourceKey]);
        
        try {
            $result = DB::select($query);
            return $result[0]->count ?? 0;
        } catch (\Exception $e) {
            \Log::warning("Failed to count {$resourceKey} for org {$organizationId}: " . $e->getMessage());
            return 0;
        }
    }

    /**
     * Get the effective limit for a resource (considering overrides)
     */
    public function getLimit(string $organizationId, string $resourceKey): int
    {
        // Check for organization-specific override first
        $override = OrganizationLimitOverride::where('organization_id', $organizationId)
            ->where('resource_key', $resourceKey)
            ->active()
            ->first();

        if ($override) {
            return $override->limit_value;
        }

        // Get from plan
        $plan = $this->subscriptionService->getCurrentPlan($organizationId);
        
        if (!$plan) {
            return 0; // No plan = no access
        }

        return $plan->getLimit($resourceKey);
    }

    /**
     * Get warning threshold for a resource
     */
    public function getWarningThreshold(string $organizationId, string $resourceKey): int
    {
        $plan = $this->subscriptionService->getCurrentPlan($organizationId);
        
        if (!$plan) {
            return 80;
        }

        return $plan->getWarningThreshold($resourceKey);
    }

    /**
     * Check if organization can create a new resource
     */
    public function canCreate(string $organizationId, string $resourceKey): array
    {
        $currentUsage = $this->getUsage($organizationId, $resourceKey);
        $limit = $this->getLimit($organizationId, $resourceKey);

        // -1 means unlimited
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
        $warningThreshold = $this->getWarningThreshold($organizationId, $resourceKey);
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
        $usage->increment($amount);
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
            $usage->decrement($amount);
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
        $limitDefinitions = LimitDefinition::active()->get();

        foreach ($limitDefinitions as $definition) {
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
     */
    public function recalculateUsage(string $organizationId): array
    {
        $recalculated = [];

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

        return $recalculated;
    }

    /**
     * Check if any limit is at warning level
     */
    public function hasWarnings(string $organizationId): array
    {
        $warnings = [];
        $limitDefinitions = LimitDefinition::active()->get();

        foreach ($limitDefinitions as $definition) {
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
        }

        return $warnings;
    }
}
