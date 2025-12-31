<?php

namespace App\Providers;

use App\Models\Organization;
use App\Observers\OrganizationSubscriptionObserver;
use App\Services\Subscription\FeatureGateService;
use App\Services\Subscription\SubscriptionNotificationService;
use App\Services\Subscription\SubscriptionService;
use App\Services\Subscription\UsageTrackingService;
use Illuminate\Support\ServiceProvider;

class SubscriptionServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        // Register services as singletons for performance
        $this->app->singleton(SubscriptionService::class);
        $this->app->singleton(FeatureGateService::class);
        $this->app->singleton(UsageTrackingService::class);
        $this->app->singleton(SubscriptionNotificationService::class);
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        // Register observer for automatic trial creation
        Organization::observe(OrganizationSubscriptionObserver::class);
    }
}
