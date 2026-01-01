<?php

namespace App\Console\Commands;

use App\Models\Organization;
use App\Models\OrganizationSubscription;
use App\Services\Notifications\NotificationService;
use App\Services\Subscription\SubscriptionNotificationService;
use App\Services\Subscription\SubscriptionService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class ProcessSubscriptionTransitions extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'subscription:process-transitions {--dry-run : Show what would be done without making changes}';

    /**
     * The console command description.
     */
    protected $description = 'Process subscription status transitions and send notification emails';

    public function __construct(
        private SubscriptionService $subscriptionService,
        private SubscriptionNotificationService $notificationService,
        private NotificationService $inAppNotificationService
    ) {
        parent::__construct();
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $dryRun = $this->option('dry-run');

        $this->info('Processing subscription transitions...');
        $this->newLine();

        // 1. Process status transitions
        if (!$dryRun) {
            $processed = $this->subscriptionService->processSubscriptionStatusTransitions();
            $this->info("Status transitions processed:");
            $this->line("  - To grace period: {$processed['to_grace_period']}");
            $this->line("  - To readonly: {$processed['to_readonly']}");
            $this->line("  - To expired: {$processed['to_expired']}");

            // Send notifications for transitions
            $this->sendTransitionNotifications($processed);
        } else {
            $this->info("[DRY RUN] Would process status transitions");
        }

        $this->newLine();

        // 2. Send renewal reminders
        $this->sendRenewalReminders($dryRun);

        $this->newLine();

        // 3. Send trial ending reminders
        $this->sendTrialReminders($dryRun);

        $this->newLine();

        // 4. Send grace period ending reminders
        $this->sendGracePeriodReminders($dryRun);

        $this->newLine();
        $this->info('Subscription processing complete!');

        return Command::SUCCESS;
    }

    /**
     * Send transition notifications
     */
    private function sendTransitionNotifications(array $processed): void
    {
        // Grace period start notifications
        if ($processed['to_grace_period'] > 0) {
            $subscriptions = OrganizationSubscription::where('status', OrganizationSubscription::STATUS_GRACE_PERIOD)
                ->where('updated_at', '>=', Carbon::now()->subMinutes(5))
                ->get();

            foreach ($subscriptions as $subscription) {
                $graceDays = $subscription->plan?->grace_period_days ?? 14;
                $this->notificationService->sendGracePeriodStart(
                    $subscription->organization_id,
                    $graceDays
                );
                
                // Also send in-app notification
                try {
                    $organization = Organization::find($subscription->organization_id);
                    if ($organization) {
                        $this->inAppNotificationService->notify(
                            'subscription.expired',
                            $organization,
                            null, // System-triggered
                            [
                                'title' => '⚠️ Subscription Expired - Grace Period Started',
                                'body' => "Your subscription has expired. You have {$graceDays} days of grace period remaining.",
                                'url' => '/subscription',
                                'level' => 'critical',
                            ]
                        );
                    }
                } catch (\Exception $e) {
                    \Log::warning('Failed to send in-app subscription notification', [
                        'organization_id' => $subscription->organization_id,
                        'error' => $e->getMessage(),
                    ]);
                }
                
                $this->line("  - Sent grace period start notification to org: {$subscription->organization_id}");
            }
        }

        // Readonly period start notifications
        if ($processed['to_readonly'] > 0) {
            $subscriptions = OrganizationSubscription::where('status', OrganizationSubscription::STATUS_READONLY)
                ->where('updated_at', '>=', Carbon::now()->subMinutes(5))
                ->get();

            foreach ($subscriptions as $subscription) {
                $readonlyDays = $subscription->plan?->readonly_period_days ?? 60;
                $this->notificationService->sendReadonlyPeriodStart(
                    $subscription->organization_id,
                    $readonlyDays
                );
                $this->line("  - Sent readonly period start notification to org: {$subscription->organization_id}");
            }
        }

        // Account blocked notifications
        if ($processed['to_expired'] > 0) {
            $subscriptions = OrganizationSubscription::where('status', OrganizationSubscription::STATUS_EXPIRED)
                ->where('updated_at', '>=', Carbon::now()->subMinutes(5))
                ->get();

            foreach ($subscriptions as $subscription) {
                $this->notificationService->sendAccountSuspended($subscription->organization_id);
                
                // Also send in-app notification
                try {
                    $organization = Organization::find($subscription->organization_id);
                    if ($organization) {
                        $this->inAppNotificationService->notify(
                            'subscription.expired',
                            $organization,
                            null, // System-triggered
                            [
                                'title' => '🚫 Account Blocked',
                                'body' => 'Your subscription has expired and your account has been blocked. Please renew to restore access.',
                                'url' => '/subscription',
                                'level' => 'critical',
                            ]
                        );
                    }
                } catch (\Exception $e) {
                    \Log::warning('Failed to send in-app subscription notification', [
                        'organization_id' => $subscription->organization_id,
                        'error' => $e->getMessage(),
                    ]);
                }
                
                $this->line("  - Sent account suspended notification to org: {$subscription->organization_id}");
            }
        }
    }

    /**
     * Send renewal reminders at different intervals
     */
    private function sendRenewalReminders(bool $dryRun): void
    {
        $reminderDays = [30, 14, 7, 1];

        foreach ($reminderDays as $days) {
            $subscriptions = $this->subscriptionService->getSubscriptionsNeedingReminder($days);

            // Filter to only those expiring on exactly this day
            $exactDay = Carbon::now()->addDays($days)->startOfDay();
            $filtered = $subscriptions->filter(function ($sub) use ($exactDay) {
                return $sub->expires_at && $sub->expires_at->startOfDay()->eq($exactDay);
            });

            if ($filtered->isNotEmpty()) {
                $this->info("Sending {$days}-day renewal reminders to {$filtered->count()} organizations:");

                foreach ($filtered as $subscription) {
                    if (!$dryRun) {
                        $this->notificationService->sendRenewalReminder(
                            $subscription->organization_id,
                            $days
                        );
                        
                        // Also send in-app notification
                        try {
                            $organization = Organization::find($subscription->organization_id);
                            if ($organization) {
                                $this->inAppNotificationService->notify(
                                    'subscription.expiring_soon',
                                    $organization,
                                    null, // System-triggered
                                    [
                                        'title' => '⏰ Subscription Expiring Soon',
                                        'body' => "Your subscription expires in {$days} day(s). Please renew to avoid service interruption.",
                                        'url' => '/subscription',
                                        'level' => 'warning',
                                    ]
                                );
                            }
                        } catch (\Exception $e) {
                            \Log::warning('Failed to send in-app subscription notification', [
                                'organization_id' => $subscription->organization_id,
                                'error' => $e->getMessage(),
                            ]);
                        }
                    }
                    $this->line("  - " . ($dryRun ? '[DRY RUN] Would notify ' : 'Notified ') . "org: {$subscription->organization_id}");
                }
            }
        }
    }

    /**
     * Send trial ending reminders
     */
    private function sendTrialReminders(bool $dryRun): void
    {
        $reminderDays = [3, 1];

        foreach ($reminderDays as $days) {
            $exactDay = Carbon::now()->addDays($days)->startOfDay();

            $trialSubscriptions = OrganizationSubscription::where('status', OrganizationSubscription::STATUS_TRIAL)
                ->whereNotNull('trial_ends_at')
                ->get()
                ->filter(function ($sub) use ($exactDay) {
                    return $sub->trial_ends_at && $sub->trial_ends_at->startOfDay()->eq($exactDay);
                });

            if ($trialSubscriptions->isNotEmpty()) {
                $this->info("Sending {$days}-day trial ending reminders to {$trialSubscriptions->count()} organizations:");

                foreach ($trialSubscriptions as $subscription) {
                    if (!$dryRun) {
                        $this->notificationService->sendTrialEndingReminder(
                            $subscription->organization_id,
                            $days
                        );
                    }
                    $this->line("  - " . ($dryRun ? '[DRY RUN] Would notify ' : 'Notified ') . "org: {$subscription->organization_id}");
                }
            }
        }
    }

    /**
     * Send grace period ending reminders
     */
    private function sendGracePeriodReminders(bool $dryRun): void
    {
        $reminderDays = [7, 3, 1];

        foreach ($reminderDays as $days) {
            $exactDay = Carbon::now()->addDays($days)->startOfDay();

            $graceSubscriptions = OrganizationSubscription::where('status', OrganizationSubscription::STATUS_GRACE_PERIOD)
                ->whereNotNull('grace_period_ends_at')
                ->get()
                ->filter(function ($sub) use ($exactDay) {
                    return $sub->grace_period_ends_at && $sub->grace_period_ends_at->startOfDay()->eq($exactDay);
                });

            if ($graceSubscriptions->isNotEmpty()) {
                $this->info("Sending {$days}-day grace period ending reminders to {$graceSubscriptions->count()} organizations:");

                foreach ($graceSubscriptions as $subscription) {
                    if (!$dryRun) {
                        $this->notificationService->sendGracePeriodEnding(
                            $subscription->organization_id,
                            $days
                        );
                    }
                    $this->line("  - " . ($dryRun ? '[DRY RUN] Would notify ' : 'Notified ') . "org: {$subscription->organization_id}");
                }
            }
        }
    }
}
