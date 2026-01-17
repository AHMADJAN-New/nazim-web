# Report Email Integration Guide

This document explains how to integrate scheduled reports with email delivery in the Nazim system.

## Overview

The notification system **already has email integration** built-in. This guide shows how to:
1. Verify email notifications are working
2. Integrate scheduled reports with email delivery
3. Create automated report emails (attendance session closed, daily financial summary, etc.)

## Current Email Notification System

### How It Works

The notification system automatically emails users when:
- They have email notifications enabled in their preferences
- The event type is email-eligible (defined in `config/notifications.php`)
- The user has a valid email address

**Email Types:**
- **Instant emails**: For critical/important notifications (via `ActionRequiredMail`)
- **Daily digest**: For less urgent notifications (via `DailyDigestMail`)

### Verifying Email Notifications

1. **Check queue worker is running:**
   ```bash
   php artisan queue:work
   ```

2. **Check email configuration in `.env`:**
   ```env
   MAIL_MAILER=smtp
   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USERNAME=your-email@gmail.com
   MAIL_PASSWORD=your-app-password
   MAIL_ENCRYPTION=tls
   MAIL_FROM_ADDRESS=noreply@nazim.edu
   MAIL_FROM_NAME="${APP_NAME}"
   ```

3. **Test notification email:**
   ```php
   // In tinker or controller
   $notificationService = app(\App\Services\Notifications\NotificationService::class);
   $notificationService->notify(
       'exam.marks_published',
       $exam,
       $user,
       [
           'title' => 'Test Notification',
           'body' => 'This is a test email notification',
           'url' => '/dashboard',
       ]
   );
   ```

## Scheduled Report Email System

### Architecture

The scheduled report email system consists of:

1. **`ReportEmailService`**: Service to email completed reports
2. **`ReportEmail`**: Mailable class for report emails
3. **`SendScheduledReportEmail`**: Job to generate and queue report emails
4. **`EmailReportWhenReady`**: Job to email reports once they're completed
5. **Scheduled Commands**: Commands for automated report generation

### Usage Examples

#### Example 1: Email Report When Attendance Session is Closed

**Already implemented!** The `AttendanceSessionObserver` automatically triggers a report email when an attendance session is closed.

**How it works:**
1. When `AttendanceSession` status changes to `'closed'`, the observer triggers
2. `SendScheduledReportEmail` job is dispatched
3. Report is generated asynchronously
4. `EmailReportWhenReady` job emails the report to recipients

**Recipients:**
- Class teacher
- Users with `attendance.reports.read` permission

#### Example 2: Daily Financial Summary

**Already scheduled!** Runs daily at 6:00 PM via Laravel scheduler.

**To run manually:**
```bash
php artisan reports:daily-financial-summary
```

**To run for specific organization:**
```bash
php artisan reports:daily-financial-summary --organization={org_id}
```

**Recipients:**
- Users with `finance.summary.read` permission

#### Example 3: Custom Scheduled Report

```php
use App\Jobs\SendScheduledReportEmail;
use App\Services\Reports\ReportConfig;

// In your controller or command
SendScheduledReportEmail::dispatch(
    reportKey: 'custom_report',
    organizationId: $organizationId,
    schoolId: $schoolId,
    reportData: [
        'columns' => [
            ['key' => 'name', 'label' => 'Name'],
            ['key' => 'value', 'label' => 'Value'],
        ],
        'rows' => [
            ['name' => 'Item 1', 'value' => '100'],
            ['name' => 'Item 2', 'value' => '200'],
        ],
    ],
    recipientUserIds: [$userId1, $userId2], // Specific users
    permission: 'reports.custom.read', // OR use permission
    subject: 'Custom Report - ' . now()->format('Y-m-d'),
    config: [
        'report_type' => 'pdf',
        'title' => 'Custom Report',
        'calendar_preference' => 'jalali',
        'language' => 'ps',
    ]
);
```

### Creating New Scheduled Reports

#### Step 1: Create Command (Optional)

For scheduled reports that run on a schedule:

```php
// backend/app/Console/Commands/SendWeeklyReport.php
namespace App\Console\Commands;

use App\Jobs\SendScheduledReportEmail;
use Illuminate\Console\Command;

class SendWeeklyReport extends Command
{
    protected $signature = 'reports:weekly {--organization=}';
    protected $description = 'Generate and email weekly reports';

    public function handle()
    {
        // Build report data
        $reportData = $this->buildReportData();

        // Dispatch job
        SendScheduledReportEmail::dispatch(
            reportKey: 'weekly_summary',
            organizationId: $this->option('organization'),
            schoolId: $schoolId,
            reportData: $reportData,
            permission: 'reports.weekly.read',
            subject: 'Weekly Summary Report',
            config: [
                'report_type' => 'pdf',
                'title' => 'Weekly Summary',
            ]
        );
    }

    private function buildReportData(): array
    {
        // Your report data logic
        return [
            'columns' => [...],
            'rows' => [...],
        ];
    }
}
```

#### Step 2: Schedule Command (Optional)

In `backend/routes/console.php`:

```php
Schedule::command('reports:weekly')
    ->weekly()
    ->mondays()
    ->at('09:00')
    ->appendOutputTo(storage_path('logs/weekly-reports.log'))
    ->description('Generate and email weekly summary reports');
```

#### Step 3: Trigger from Model Event (Optional)

For reports triggered by model events:

```php
// In AppServiceProvider::boot()
YourModel::observe(YourModelObserver::class);

// In YourModelObserver
public function updated(YourModel $model)
{
    if ($model->isDirty('status') && $model->status === 'completed') {
        SendScheduledReportEmail::dispatch(
            reportKey: 'your_report',
            organizationId: $model->organization_id,
            schoolId: $model->school_id,
            reportData: $this->buildReportData($model),
            permission: 'reports.your.read',
        );
    }
}
```

## Integration with Notification System

### Option 1: Use Notification System for Report Alerts

You can use the notification system to alert users that a report is ready:

```php
$notificationService = app(\App\Services\Notifications\NotificationService::class);
$notificationService->notify(
    'report.ready',
    $reportRun,
    null, // system-triggered
    [
        'title' => 'Report Ready',
        'body' => "Your {$reportRun->title} report is ready for download.",
        'url' => "/reports/{$reportRun->id}/download",
    ]
);
```

### Option 2: Direct Email (Current Implementation)

The current implementation emails reports directly without creating notifications. This is better for:
- Scheduled reports (daily/weekly summaries)
- Reports that don't need in-app notifications
- Bulk report emails

## Email Templates

### Report Email Template

The report email template is located at:
- `backend/resources/views/emails/report.blade.php`

**Customize the template:**
```blade
<h1>{{ $reportTitle }}</h1>
<p>Your requested report has been generated and is attached to this email.</p>
<!-- Report file is automatically attached -->
```

## Configuration

### Email Preferences

Users can control email notifications via:
- **API**: `GET /api/notifications/preferences`
- **Update**: `PUT /api/notifications/preferences/{type}`

**Preference options:**
- `in_app_enabled`: Show in-app notifications (default: true)
- `email_enabled`: Send email notifications (default: based on event type)
- `frequency`: `instant` or `daily_digest` (default: based on event type)

### Report Email Recipients

**Options:**
1. **Specific User IDs**: Pass `recipientUserIds` array
2. **Permission-based**: Pass `permission` string (users with permission receive email)
3. **Both**: Combine both (users in array + users with permission)

## Troubleshooting

### Reports Not Emailing

1. **Check queue worker:**
   ```bash
   php artisan queue:work
   ```

2. **Check report status:**
   ```php
   $reportRun = ReportRun::find($id);
   echo $reportRun->status; // Should be 'completed'
   ```

3. **Check email configuration:**
   ```bash
   php artisan tinker
   Mail::raw('Test email', function ($message) {
       $message->to('test@example.com')->subject('Test');
   });
   ```

4. **Check logs:**
   ```bash
   tail -f storage/logs/laravel.log
   ```

### Reports Generating But Not Emailing

- Check `EmailReportWhenReady` job is running
- Check recipients have valid email addresses
- Check recipients have required permissions (if using permission-based)

### Email Delivery Failures

- Check SMTP credentials in `.env`
- Check email server logs
- Check Laravel logs for error messages
- Verify `MAIL_FROM_ADDRESS` is valid

## Best Practices

1. **Use Queues**: Always use queued jobs for report generation and emailing
2. **Set Timeouts**: Set appropriate timeouts for long-running reports
3. **Error Handling**: Always log errors and handle failures gracefully
4. **Recipients**: Use permission-based recipients for flexibility
5. **Scheduling**: Use Laravel scheduler for regular reports
6. **Testing**: Test email delivery in development before production

## Future Enhancements

Potential future enhancements:
- Email report previews (thumbnails)
- Multiple report formats in one email
- Report email templates per report type
- User preferences for report email frequency
- Report email scheduling (user-defined schedules)
- Report email digests (multiple reports in one email)

