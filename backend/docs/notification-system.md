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
// In any domain service or listener
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
```

## Operations Notes

- Run `php artisan migrate` to create tables.
- Start the queue worker for non-blocking email: `php artisan queue:work`.
- Daily digests are scheduled via queued jobs with end-of-day delay; adjust scheduling or cron as needed.
- Sample data is seeded via `NotificationSeeder` (included in `DatabaseSeeder`).
