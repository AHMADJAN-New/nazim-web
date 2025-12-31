<?php

namespace App\Services\Subscription;

use App\Models\Organization;
use App\Models\OrganizationSubscription;
use App\Models\SubscriptionEmailLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class SubscriptionNotificationService
{
    /**
     * Send trial welcome email
     */
    public function sendTrialWelcome(string $organizationId): void
    {
        $this->sendNotification(
            $organizationId,
            SubscriptionEmailLog::TYPE_TRIAL_WELCOME,
            'Welcome to Nazim School Management System - Trial Started',
            $this->getTrialWelcomeTemplate($organizationId)
        );
    }

    /**
     * Send trial ending reminder
     */
    public function sendTrialEndingReminder(string $organizationId, int $daysLeft): void
    {
        $this->sendNotification(
            $organizationId,
            SubscriptionEmailLog::TYPE_TRIAL_ENDING,
            "Your Trial Ends in {$daysLeft} Days",
            $this->getTrialEndingTemplate($organizationId, $daysLeft)
        );
    }

    /**
     * Send renewal reminder
     */
    public function sendRenewalReminder(string $organizationId, int $daysBeforeExpiry): void
    {
        $type = match ($daysBeforeExpiry) {
            30 => SubscriptionEmailLog::TYPE_RENEWAL_REMINDER_30,
            14 => SubscriptionEmailLog::TYPE_RENEWAL_REMINDER_14,
            7 => SubscriptionEmailLog::TYPE_RENEWAL_REMINDER_7,
            1 => SubscriptionEmailLog::TYPE_RENEWAL_REMINDER_1,
            default => "renewal_reminder_{$daysBeforeExpiry}",
        };

        $this->sendNotification(
            $organizationId,
            $type,
            "Subscription Renewal Reminder - {$daysBeforeExpiry} Days Left",
            $this->getRenewalReminderTemplate($organizationId, $daysBeforeExpiry)
        );
    }

    /**
     * Send grace period start notification
     */
    public function sendGracePeriodStart(string $organizationId, int $gracePeriodDays): void
    {
        $this->sendNotification(
            $organizationId,
            SubscriptionEmailLog::TYPE_GRACE_PERIOD_START,
            "Important: Your Subscription Has Expired - {$gracePeriodDays}-Day Grace Period Started",
            $this->getGracePeriodStartTemplate($organizationId, $gracePeriodDays)
        );
    }

    /**
     * Send grace period ending notification
     */
    public function sendGracePeriodEnding(string $organizationId, int $daysLeft): void
    {
        $this->sendNotification(
            $organizationId,
            SubscriptionEmailLog::TYPE_GRACE_PERIOD_ENDING,
            "Urgent: Grace Period Ends in {$daysLeft} Days",
            $this->getGracePeriodEndingTemplate($organizationId, $daysLeft)
        );
    }

    /**
     * Send readonly period start notification
     */
    public function sendReadonlyPeriodStart(string $organizationId, int $readonlyPeriodDays): void
    {
        $this->sendNotification(
            $organizationId,
            SubscriptionEmailLog::TYPE_READONLY_PERIOD_START,
            "Account Restricted to Read-Only Mode",
            $this->getReadonlyPeriodStartTemplate($organizationId, $readonlyPeriodDays)
        );
    }

    /**
     * Send account suspended notification
     */
    public function sendAccountSuspended(string $organizationId): void
    {
        $this->sendNotification(
            $organizationId,
            SubscriptionEmailLog::TYPE_ACCOUNT_SUSPENDED,
            "Account Access Blocked - Action Required",
            $this->getAccountSuspendedTemplate($organizationId)
        );
    }

    /**
     * Send payment confirmed notification
     */
    public function sendPaymentConfirmed(string $organizationId, float $amount, string $currency): void
    {
        $formattedAmount = number_format($amount, 2) . ' ' . $currency;
        
        $this->sendNotification(
            $organizationId,
            SubscriptionEmailLog::TYPE_PAYMENT_CONFIRMED,
            "Payment Confirmed - {$formattedAmount}",
            $this->getPaymentConfirmedTemplate($organizationId, $formattedAmount)
        );
    }

    /**
     * Send payment rejected notification
     */
    public function sendPaymentRejected(string $organizationId, string $reason): void
    {
        $this->sendNotification(
            $organizationId,
            SubscriptionEmailLog::TYPE_PAYMENT_REJECTED,
            "Payment Could Not Be Processed",
            $this->getPaymentRejectedTemplate($organizationId, $reason)
        );
    }

    /**
     * Send subscription activated notification
     */
    public function sendSubscriptionActivated(string $organizationId, string $planName, string $expiresAt): void
    {
        $this->sendNotification(
            $organizationId,
            SubscriptionEmailLog::TYPE_SUBSCRIPTION_ACTIVATED,
            "Subscription Activated - {$planName}",
            $this->getSubscriptionActivatedTemplate($organizationId, $planName, $expiresAt)
        );
    }

    /**
     * Send limit warning notification
     */
    public function sendLimitWarning(string $organizationId, string $resourceName, int $current, int $limit): void
    {
        $percentage = round(($current / $limit) * 100);
        
        $this->sendNotification(
            $organizationId,
            SubscriptionEmailLog::TYPE_LIMIT_WARNING,
            "Usage Warning: {$resourceName} at {$percentage}%",
            $this->getLimitWarningTemplate($organizationId, $resourceName, $current, $limit, $percentage)
        );
    }

    /**
     * Send limit reached notification
     */
    public function sendLimitReached(string $organizationId, string $resourceName, int $limit): void
    {
        $this->sendNotification(
            $organizationId,
            SubscriptionEmailLog::TYPE_LIMIT_REACHED,
            "Limit Reached: {$resourceName}",
            $this->getLimitReachedTemplate($organizationId, $resourceName, $limit)
        );
    }

    /**
     * Send a notification email
     */
    private function sendNotification(
        string $organizationId,
        string $emailType,
        string $subject,
        string $body
    ): void {
        $organization = Organization::find($organizationId);
        if (!$organization) {
            \Log::warning("Cannot send notification: Organization {$organizationId} not found");
            return;
        }

        // Get admin emails for the organization
        $adminEmails = $this->getAdminEmails($organizationId);
        
        if (empty($adminEmails)) {
            \Log::warning("No admin emails found for organization {$organizationId}");
            return;
        }

        $subscription = OrganizationSubscription::where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->first();

        foreach ($adminEmails as $email) {
            try {
                // Send email using Laravel's mail facade
                Mail::raw($body, function ($message) use ($email, $subject) {
                    $message->to($email)
                        ->subject($subject);
                });

                // Log successful send
                SubscriptionEmailLog::log(
                    $organizationId,
                    $emailType,
                    $email,
                    $subject,
                    $body,
                    SubscriptionEmailLog::STATUS_SENT,
                    $subscription?->id
                );
            } catch (\Exception $e) {
                // Log failed send
                SubscriptionEmailLog::log(
                    $organizationId,
                    $emailType,
                    $email,
                    $subject,
                    $body,
                    SubscriptionEmailLog::STATUS_FAILED,
                    $subscription?->id,
                    $e->getMessage()
                );

                \Log::error("Failed to send subscription notification: " . $e->getMessage());
            }
        }
    }

    /**
     * Get admin emails for an organization
     */
    private function getAdminEmails(string $organizationId): array
    {
        // Get admin users for the organization
        return DB::table('profiles')
            ->join('model_has_roles', function ($join) {
                $join->on('profiles.id', '=', 'model_has_roles.model_id')
                    ->where('model_has_roles.model_type', '=', 'App\\Models\\User');
            })
            ->join('roles', function ($join) {
                $join->on('model_has_roles.role_id', '=', 'roles.id')
                    ->where('roles.name', '=', 'admin');
            })
            ->where('profiles.organization_id', $organizationId)
            ->where('profiles.is_active', true)
            ->whereNotNull('profiles.email')
            ->pluck('profiles.email')
            ->toArray();
    }

    /**
     * Get organization name
     */
    private function getOrganizationName(string $organizationId): string
    {
        $org = Organization::find($organizationId);
        return $org?->name ?? 'Your Organization';
    }

    // Email templates
    private function getTrialWelcomeTemplate(string $organizationId): string
    {
        $orgName = $this->getOrganizationName($organizationId);
        return <<<EMAIL
Welcome to Nazim School Management System!

Your 7-day free trial for {$orgName} has started.

During your trial, you have access to all features with limited counts:
- 5 Students
- 2 Staff members
- 2 Report exports
- And more...

To continue using the system after your trial, please upgrade to a paid plan.

Visit your subscription page to view available plans and pricing.

Thank you for choosing Nazim!

Best regards,
The Nazim Team
EMAIL;
    }

    private function getTrialEndingTemplate(string $organizationId, int $daysLeft): string
    {
        $orgName = $this->getOrganizationName($organizationId);
        return <<<EMAIL
Your trial for {$orgName} ends in {$daysLeft} days!

To continue using Nazim School Management System without interruption, please upgrade to a paid plan.

What happens after your trial ends:
1. 14-day grace period with full access
2. 2-month read-only period
3. Account blocked until renewal

Upgrade now to keep all your data and continue managing your school.

Best regards,
The Nazim Team
EMAIL;
    }

    private function getRenewalReminderTemplate(string $organizationId, int $daysBeforeExpiry): string
    {
        $orgName = $this->getOrganizationName($organizationId);
        return <<<EMAIL
Your subscription for {$orgName} expires in {$daysBeforeExpiry} days.

To ensure uninterrupted access to your school management system, please renew your subscription.

You can submit a renewal request through your subscription page.

After your subscription expires:
1. 14-day grace period - Full access
2. 2-month read-only period - View only
3. Account blocked until renewal

Don't lose access to your important school data. Renew today!

Best regards,
The Nazim Team
EMAIL;
    }

    private function getGracePeriodStartTemplate(string $organizationId, int $gracePeriodDays): string
    {
        $orgName = $this->getOrganizationName($organizationId);
        return <<<EMAIL
IMPORTANT: Your subscription for {$orgName} has expired.

You are now in a {$gracePeriodDays}-day grace period. During this time, you still have full access to all features.

After the grace period ends:
- Your account will enter read-only mode for 2 months
- You will not be able to add or edit data
- After the read-only period, your account will be blocked

Please renew your subscription immediately to avoid any disruption.

Best regards,
The Nazim Team
EMAIL;
    }

    private function getGracePeriodEndingTemplate(string $organizationId, int $daysLeft): string
    {
        $orgName = $this->getOrganizationName($organizationId);
        return <<<EMAIL
URGENT: Your grace period for {$orgName} ends in {$daysLeft} days!

After the grace period ends, your account will enter read-only mode. You will:
- NOT be able to add new students, staff, or data
- NOT be able to edit existing records
- Only be able to VIEW your data

Please renew your subscription NOW to maintain full access.

Best regards,
The Nazim Team
EMAIL;
    }

    private function getReadonlyPeriodStartTemplate(string $organizationId, int $readonlyPeriodDays): string
    {
        $orgName = $this->getOrganizationName($organizationId);
        return <<<EMAIL
Your account for {$orgName} is now in READ-ONLY mode.

For the next {$readonlyPeriodDays} days, you can:
✓ View all your data
✓ Export reports
✗ Add new records
✗ Edit existing data

After {$readonlyPeriodDays} days, your account will be completely blocked.

Please renew your subscription to restore full access.

Best regards,
The Nazim Team
EMAIL;
    }

    private function getAccountSuspendedTemplate(string $organizationId): string
    {
        $orgName = $this->getOrganizationName($organizationId);
        return <<<EMAIL
Your account for {$orgName} has been BLOCKED.

Your subscription has expired and both the grace period and read-only period have ended.

You currently cannot:
- Access your school data
- Add or edit any records
- Generate reports

To restore access to your account and all your data, please renew your subscription immediately.

Your data is safe and will be available once you renew.

Best regards,
The Nazim Team
EMAIL;
    }

    private function getPaymentConfirmedTemplate(string $organizationId, string $formattedAmount): string
    {
        $orgName = $this->getOrganizationName($organizationId);
        return <<<EMAIL
Payment Confirmed!

Your payment of {$formattedAmount} for {$orgName} has been confirmed.

Your subscription has been activated. Thank you for your payment!

You now have full access to all features included in your plan.

Best regards,
The Nazim Team
EMAIL;
    }

    private function getPaymentRejectedTemplate(string $organizationId, string $reason): string
    {
        $orgName = $this->getOrganizationName($organizationId);
        return <<<EMAIL
Payment Could Not Be Processed

We were unable to process your payment for {$orgName}.

Reason: {$reason}

Please submit a new payment with the correct details, or contact our support team for assistance.

Best regards,
The Nazim Team
EMAIL;
    }

    private function getSubscriptionActivatedTemplate(string $organizationId, string $planName, string $expiresAt): string
    {
        $orgName = $this->getOrganizationName($organizationId);
        return <<<EMAIL
Your Subscription is Now Active!

Congratulations! Your subscription for {$orgName} has been activated.

Plan: {$planName}
Expires: {$expiresAt}

You now have access to all features included in your plan.

Thank you for choosing Nazim School Management System!

Best regards,
The Nazim Team
EMAIL;
    }

    private function getLimitWarningTemplate(string $organizationId, string $resourceName, int $current, int $limit, int $percentage): string
    {
        $orgName = $this->getOrganizationName($organizationId);
        return <<<EMAIL
Usage Warning for {$orgName}

You are using {$percentage}% of your {$resourceName} limit.

Current usage: {$current} / {$limit}

Consider upgrading your plan to increase your limits, or remove unused resources.

Best regards,
The Nazim Team
EMAIL;
    }

    private function getLimitReachedTemplate(string $organizationId, string $resourceName, int $limit): string
    {
        $orgName = $this->getOrganizationName($organizationId);
        return <<<EMAIL
Limit Reached for {$orgName}

You have reached your {$resourceName} limit of {$limit}.

You will not be able to add more {$resourceName} until you:
- Upgrade to a higher plan
- Remove existing items
- Request a limit override from support

Best regards,
The Nazim Team
EMAIL;
    }
}
