<?php

namespace App\Providers;

use App\Models\Organization;
use App\Models\Student;
use App\Models\Staff;
use App\Models\ClassModel;
use App\Models\SchoolBranding;
use App\Models\Exam;
use App\Models\FinanceAccount;
use App\Models\IncomeEntry;
use App\Models\ExpenseEntry;
use App\Models\Asset;
use App\Models\LibraryBook;
use App\Models\Event;
use App\Models\CertificateTemplate;
use App\Models\IdCardTemplate;
use App\Models\IncomingDocument;
use App\Observers\OrganizationObserver;
use App\Observers\UsageTrackingObserver;
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
        // Ensure view compiled path is set (fixes "Please provide a valid cache path" error)
        // Laravel's default config uses realpath() which returns false if directory doesn't exist
        $compiledPath = config('view.compiled');
        if (empty($compiledPath) || $compiledPath === false) {
            $viewsPath = storage_path('framework/views');
            // Ensure directory exists
            if (!is_dir($viewsPath)) {
                @mkdir($viewsPath, 0775, true);
            }
            config(['view.compiled' => $viewsPath]);
        }

        // Register Organization observer to auto-create roles when organization is created
        Organization::observe(OrganizationObserver::class);

        // Register UsageTrackingObserver for all trackable resources
        // This provides performance optimization by updating counts incrementally
        Student::observe(UsageTrackingObserver::class);
        Staff::observe(UsageTrackingObserver::class);
        ClassModel::observe(UsageTrackingObserver::class);
        SchoolBranding::observe(UsageTrackingObserver::class);
        Exam::observe(UsageTrackingObserver::class);
        FinanceAccount::observe(UsageTrackingObserver::class);
        IncomeEntry::observe(UsageTrackingObserver::class);
        ExpenseEntry::observe(UsageTrackingObserver::class);
        Asset::observe(UsageTrackingObserver::class);
        LibraryBook::observe(UsageTrackingObserver::class);
        Event::observe(UsageTrackingObserver::class);
        CertificateTemplate::observe(UsageTrackingObserver::class);
        IdCardTemplate::observe(UsageTrackingObserver::class);
        IncomingDocument::observe(UsageTrackingObserver::class);

        Gate::policy(\App\Models\IncomingDocument::class, \App\Policies\IncomingDocumentPolicy::class);
        Gate::policy(\App\Models\OutgoingDocument::class, \App\Policies\OutgoingDocumentPolicy::class);
        Gate::policy(\App\Models\LetterTemplate::class, \App\Policies\LetterTemplatePolicy::class);
        Gate::policy(\App\Models\Letterhead::class, \App\Policies\LetterheadPolicy::class);
        Gate::policy(\App\Models\DocumentFile::class, \App\Policies\DocumentFilePolicy::class);
    }
}
