<?php

namespace App\Observers;

use App\Models\Organization;
use App\Services\Subscription\SubscriptionNotificationService;
use App\Services\Subscription\SubscriptionService;
use Illuminate\Support\Facades\Log;

class OrganizationSubscriptionObserver
{
    public function __construct(
        private SubscriptionService $subscriptionService,
        private SubscriptionNotificationService $notificationService
    ) {}

    /**
     * Handle the Organization "created" event.
     * Automatically creates a trial subscription for new organizations.
     */
    public function created(Organization $organization): void
    {
        try {
            // Create trial subscription for new organization
            $subscription = $this->subscriptionService->createTrialSubscription($organization->id);

            Log::info("Created trial subscription for organization: {$organization->id}");

            // Send welcome email
            $this->notificationService->sendTrialWelcome($organization->id);

            Log::info("Sent trial welcome email for organization: {$organization->id}");
        } catch (\Exception $e) {
            Log::error("Failed to create trial subscription for organization {$organization->id}: " . $e->getMessage());
        }
    }
}
