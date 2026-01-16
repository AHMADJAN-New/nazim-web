<?php

namespace App\Observers;

use App\Models\UsageCurrent;
use App\Services\Subscription\UsageTrackingService;
use Illuminate\Support\Facades\Log;

/**
 * Observer to update usage counts incrementally when resources are created/deleted/updated
 * This provides performance optimization by avoiding full database counts on every check
 */
class UsageTrackingObserver
{
    /**
     * Resource key mapping - maps model class to resource_key
     */
    private array $resourceKeyMap = [
        \App\Models\Student::class => 'students',
        \App\Models\Staff::class => 'staff',
        \App\Models\ClassModel::class => 'classes',
        \App\Models\SchoolBranding::class => 'schools',
        \App\Models\Exam::class => 'exams',
        \App\Models\FinanceAccount::class => 'finance_accounts',
        \App\Models\IncomeEntry::class => 'income_entries',
        \App\Models\ExpenseEntry::class => 'expense_entries',
        \App\Models\Asset::class => 'assets',
        \App\Models\LibraryBook::class => 'library_books',
        \App\Models\Event::class => 'events',
        \App\Models\CertificateTemplate::class => 'certificate_templates',
        \App\Models\IdCardTemplate::class => 'id_card_templates',
        \App\Models\IncomingDocument::class => 'documents',
    ];

    /**
     * Resources that should only count active records
     */
    private array $activeOnlyResources = [
        'finance_accounts',
    ];

    /**
     * Handle the model "created" event
     */
    public function created($model): void
    {
        $resourceKey = $this->getResourceKey($model);
        if (!$resourceKey) {
            return;
        }

        // For resources that count only active, check if model is active
        if (in_array($resourceKey, $this->activeOnlyResources)) {
            if ($resourceKey === 'finance_accounts' && !$model->is_active) {
                return; // Don't count inactive accounts
            }
        }

        $this->updateUsageCount($model, 'increment');
    }

    /**
     * Handle the model "deleted" event (soft delete)
     * CRITICAL: Laravel fires this event for both soft deletes (SoftDeletes trait) and hard deletes
     * For soft deletes, the model still exists in DB with deleted_at set, so we decrement count
     * For hard deletes, the model is removed from DB, so we also decrement count
     */
    public function deleted($model): void
    {
        $resourceKey = $this->getResourceKey($model);
        if (!$resourceKey) {
            return;
        }

        // Check if model should have been counted before deletion
        $shouldDecrement = true;

        // For resources that count only active, check if model was active before deletion
        if (in_array($resourceKey, $this->activeOnlyResources)) {
            if ($resourceKey === 'finance_accounts') {
                // Get the original is_active value before deletion
                // Use getOriginal() to get the value before the delete operation
                $wasActive = $model->getOriginal('is_active') ?? $model->is_active ?? false;
                if (!$wasActive) {
                    // Wasn't being counted anyway (inactive), so don't decrement
                    $shouldDecrement = false;
                }
            }
        }

        if ($shouldDecrement) {
            $this->updateUsageCount($model, 'decrement');
        }
    }

    /**
     * Handle the model "restored" event (soft delete restore)
     * CRITICAL: Only increment if the restored model should be counted
     */
    public function restored($model): void
    {
        $resourceKey = $this->getResourceKey($model);
        if (!$resourceKey) {
            return;
        }

        // For resources that count only active, check if model is active
        if (in_array($resourceKey, $this->activeOnlyResources)) {
            if ($resourceKey === 'finance_accounts' && !$model->is_active) {
                return; // Don't count inactive accounts
            }
        }

        $this->updateUsageCount($model, 'increment');
    }

    /**
     * Handle the model "updated" event
     * Only updates if is_active status changed (for resources that count only active)
     */
    public function updated($model): void
    {
        $resourceKey = $this->getResourceKey($model);
        if (!$resourceKey) {
            return;
        }

        // Only handle is_active changes for resources that count only active
        if (!in_array($resourceKey, $this->activeOnlyResources)) {
            return;
        }

        // Check if is_active changed
        if ($model->wasChanged('is_active')) {
            $wasActive = $model->getOriginal('is_active');
            $isActive = $model->is_active;

            // If changed from inactive to active, increment
            if (!$wasActive && $isActive) {
                $this->updateUsageCount($model, 'increment');
            }
            // If changed from active to inactive, decrement
            elseif ($wasActive && !$isActive) {
                $this->updateUsageCount($model, 'decrement');
            }
        }
    }

    /**
     * Update usage count for a model
     */
    private function updateUsageCount($model, string $operation): void
    {
        try {
            $resourceKey = $this->getResourceKey($model);
            if (!$resourceKey) {
                return;
            }

            $organizationId = $this->getOrganizationId($model);
            if (!$organizationId) {
                return;
            }

            // Get or create usage record
            $usage = UsageCurrent::firstOrCreate(
                [
                    'organization_id' => $organizationId,
                    'resource_key' => $resourceKey,
                ],
                [
                    'id' => (string) \Illuminate\Support\Str::uuid(),
                    'current_count' => 0,
                    'last_calculated_at' => now(),
                ]
            );

            // Update count
            if ($operation === 'increment') {
                $usage->incrementCount(1);
            } elseif ($operation === 'decrement') {
                $usage->decrementCount(1);
            }

            // Update last_calculated_at to mark as recently updated
            $usage->update(['last_calculated_at' => now()]);
        } catch (\Exception $e) {
            // Log error but don't fail the operation
            Log::warning("Failed to update usage count for model: " . get_class($model), [
                'model_id' => $model->id ?? null,
                'operation' => $operation,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Get resource key for a model
     */
    private function getResourceKey($model): ?string
    {
        $modelClass = get_class($model);
        return $this->resourceKeyMap[$modelClass] ?? null;
    }

    /**
     * Get organization_id from model
     */
    private function getOrganizationId($model): ?string
    {
        return $model->organization_id ?? null;
    }
}

