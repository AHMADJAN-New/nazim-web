<?php

namespace App\Providers;

use App\Models\Organization;
use App\Observers\OrganizationObserver;
use App\Services\Notifications\NotificationRuleRegistry;
use App\Services\Notifications\NotificationService;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(NotificationRuleRegistry::class, function () {
            return new NotificationRuleRegistry();
        });

        $this->app->singleton(NotificationService::class, function ($app) {
            return new NotificationService(
                $app->make(NotificationRuleRegistry::class),
                $app->make(\App\Services\Subscription\FeatureGateService::class)
            );
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register Organization observer to auto-create roles when organization is created
        Organization::observe(OrganizationObserver::class);

        Gate::policy(\App\Models\IncomingDocument::class, \App\Policies\IncomingDocumentPolicy::class);
        Gate::policy(\App\Models\OutgoingDocument::class, \App\Policies\OutgoingDocumentPolicy::class);
        Gate::policy(\App\Models\LetterTemplate::class, \App\Policies\LetterTemplatePolicy::class);
        Gate::policy(\App\Models\Letterhead::class, \App\Policies\LetterheadPolicy::class);
        Gate::policy(\App\Models\DocumentFile::class, \App\Policies\DocumentFilePolicy::class);
    }
}
