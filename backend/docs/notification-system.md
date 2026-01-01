# Nazim Notification System (MVP)

This document describes the minimal yet production-ready notification system introduced for Nazim.

## Architecture Overview

- **Events vs. Deliveries:** `notification_events` capture *what happened* (type, actor, entity, payload). Per-user `notifications` are created from events, and email-specific state is tracked in `notification_deliveries`.
- **Recipient Resolution:** `NotificationRuleRegistry` maps event types to resolver callbacks. Each resolver runs inside the organization scope and can be customized or extended via service binding.
- **Core Service:** `NotificationService::notify($eventType, Model $entity, ?User $actor, array $payload = [])`:
  - Persists the event.
  - Resolves recipients (permission-aware + organization-scoped).
  - Stores in-app notifications.
  - Queues email deliveries (instant or daily digest) using Laravel queues.
- **Preferences:** `notification_preferences` let users opt in/out per event type and choose `instant` vs. `daily_digest` for eligible events.
- **Email:** Reusable templates:
  - `ActionRequiredMail` for instant, high-value alerts.
  - `DailyDigestMail` for digest-able events (e.g., overdue finance reminders).
- **Queues:** Email delivery is non-blocking through `SendNotificationEmail` and `SendNotificationDigestEmail` jobs. Use the database queue driver in MVP.

## Event Types (MVP)

Registered event keys (snake/kebab free) are aligned with the product brief:

- **Admissions:** `admission.created`, `admission.approved`, `admission.rejected`
- **Finance:** `invoice.created`, `payment.received`, `invoice.overdue` (digest)
- **Attendance:** `attendance.sync_failed` (critical), `attendance.anomaly`
- **DMS / Letters:** `doc.assigned`, `doc.approved`, `doc.returned`
- **System:** `system.backup_failed` (critical), `system.license_expiring`
- **Security:** `security.password_changed` (critical), `security.new_device_login` (critical)
- **Exams:** `exam.created`, `exam.published`, `exam.marks_published`, `exam.timetable_updated` (warning)
- **Library:** `library.book_overdue` (critical), `library.book_due_soon` (warning, digest), `library.book_reserved`
- **Assets:** `asset.assigned`, `asset.maintenance_due` (warning), `asset.returned`
- **Subscription:** `subscription.limit_approaching` (warning), `subscription.limit_reached` (critical), `subscription.expiring_soon` (warning), `subscription.expired` (critical)

Email eligibility and severity levels are centralized in `config/notifications.php`.

## Database Tables

- `notification_events` — immutable event log (org, type, actor, entity, payload).
- `notifications` — per-user in-app items with read state and severity.
- `notification_deliveries` — audit trail for email attempts, status, provider IDs, errors, and timestamps.
- `notification_preferences` — per-user channel toggle + frequency (`instant` / `daily_digest`).

Indexes are present for org/user scopes, read state, and status to keep queries responsive.

## Extending Rules

1. Inject `NotificationRuleRegistry` and call `register('event.key', fn($entity, $actor) => collect([...]))`.
2. Resolvers should:
   - Stay organization-scoped.
   - Prefer permission-aware user sets (e.g., `User::permission('finance_documents.read')` after `setPermissionsTeamId()`).
   - Return `Collection<User>`.

## API Endpoints

All routes are organization-scoped and permission-checked.

- `GET /api/notifications` — paginated (default 30, max 50) with `unread_only` flag.
- `POST /api/notifications/{id}/read` — mark single notification read.
- `POST /api/notifications/read-all` — mark all read for current user/org.
- `GET /api/notifications/unread-count` — lightweight counter.
- `GET /api/notifications/preferences` — get user's notification preferences.
- `PUT /api/notifications/preferences/{type}` — update preference for specific event type.

Permissions:
- `notifications.read` for list/count
- `notifications.update` for read actions
- `notifications.manage_preferences` for preference management

## Usage Examples

```php
// Example 1: Document assignment notification
$notificationService->notify(
    'doc.assigned',
    $incomingDocument,   // must expose organization_id
    $request->user(),    // actor
    [
        'title' => 'New document assigned',
        'body' => 'Please review the import letter today.',
        'url' => "/dms/incoming/{$incomingDocument->id}",
    ]
);

// Example 2: Security alert - password changed
$notificationService->notify(
    'security.password_changed',
    $user,               // the User whose password changed
    $user,               // actor is the user themselves
    [
        'title' => 'Password Changed',
        'body' => 'Your password was successfully changed. If you did not make this change, please contact support immediately.',
        'url' => '/settings/security',
    ]
);

// Example 3: Security alert - new device login
$notificationService->notify(
    'security.new_device_login',
    $user,               // the User who logged in
    $user,               // actor
    [
        'title' => 'New Device Login Detected',
        'body' => "Login from {$deviceInfo['name']} at {$loginTime}. If this wasn't you, please secure your account.",
        'url' => '/settings/security',
        'device_info' => $deviceInfo,
        'ip_address' => $ipAddress,
    ]
);

// Example 4: Exam marks published
$notificationService->notify(
    'exam.marks_published',
    $exam,               // Exam model
    $request->user(),    // teacher/admin who published
    [
        'title' => 'Exam Results Published',
        'body' => "Results for {$exam->name} are now available.",
        'url' => "/exams/{$exam->id}/results",
    ]
);

// Example 5: Library book overdue
$notificationService->notify(
    'library.book_overdue',
    $libraryLoan,        // LibraryLoan model with borrower_user_id
    null,                // system-triggered
    [
        'title' => 'Overdue Library Book',
        'body' => "'{$book->title}' is overdue. Please return it as soon as possible to avoid penalties.",
        'url' => '/library/my-loans',
        'days_overdue' => $daysOverdue,
    ]
);

// Example 6: Asset maintenance due
$notificationService->notify(
    'asset.maintenance_due',
    $asset,              // Asset model
    null,                // system-triggered
    [
        'title' => 'Asset Maintenance Due',
        'body' => "{$asset->name} requires maintenance within the next 7 days.",
        'url' => "/assets/{$asset->id}",
        'maintenance_type' => $asset->scheduled_maintenance_type,
    ]
);

// Example 7: Subscription limit approaching
$notificationService->notify(
    'subscription.limit_approaching',
    $organization,       // Organization model
    null,                // system-triggered
    [
        'title' => 'Subscription Limit Warning',
        'body' => "You have used {$usage}% of your {$limitType} limit. Consider upgrading your plan.",
        'url' => '/settings/subscription',
        'limit_type' => $limitType,
        'usage_percentage' => $usage,
    ]
);

// Example 8: Subscription expired
$notificationService->notify(
    'subscription.expired',
    $organization,       // Organization model
    null,                // system-triggered
    [
        'title' => 'Subscription Expired',
        'body' => 'Your subscription has expired. Please renew to continue using Nazim.',
        'url' => '/settings/subscription',
        'expired_at' => $subscription->expires_at,
    ]
);
```

## Operations Notes

- Run `php artisan migrate` to create tables.
- Start the queue worker for non-blocking email: `php artisan queue:work`.
- Daily digests are scheduled via queued jobs with end-of-day delay; adjust scheduling or cron as needed.
- Sample data is seeded via `NotificationSeeder` (included in `DatabaseSeeder`).
