<?php

namespace App\Services\Notifications;

use App\Jobs\SendNotificationDigestEmail;
use App\Jobs\SendNotificationEmail;
use App\Models\Notification;
use App\Models\NotificationDelivery;
use App\Models\NotificationEvent;
use App\Models\NotificationPreference;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class NotificationService
{
    public function __construct(
        private NotificationRuleRegistry $ruleRegistry
    ) {
    }

    /**
     * Entrypoint for recording and dispatching notifications.
     */
    public function notify(string $eventType, Model $entity, ?User $actor = null, array $payload = []): void
    {
        $organizationId = $payload['organization_id']
            ?? $entity->organization_id
            ?? $entity->organizationId
            ?? null;

        if (!$organizationId) {
            Log::warning('Notification dropped: missing organization context', [
                'event' => $eventType,
                'entity' => get_class($entity),
            ]);
            return;
        }

        $event = NotificationEvent::create([
            'organization_id' => $organizationId,
            'type' => $eventType,
            'actor_user_id' => $actor?->id,
            'entity_type' => get_class($entity),
            'entity_id' => (string) $entity->getKey(),
            'payload_json' => $payload,
        ]);

        $recipients = $this->ruleRegistry
            ->resolve($eventType, $entity, $actor)
            ->unique('id');
        
        // Optionally filter out actor (default: true, but can be overridden in payload)
        $excludeActor = $payload['exclude_actor'] ?? true;
        if ($excludeActor && $actor) {
            $recipients = $recipients->filter(fn (User $user) => $user->id !== $actor->id);
        }

        Log::info('Notification recipients resolved', [
            'event' => $eventType,
            'event_id' => $event->id,
            'organization_id' => $organizationId,
            'recipient_count' => $recipients->count(),
            'recipient_ids' => $recipients->pluck('id')->toArray(),
        ]);

        if ($recipients->isEmpty()) {
            Log::warning('Notification created without recipients', [
                'event' => $eventType,
                'event_id' => $event->id,
                'organization_id' => $organizationId,
                'entity_type' => get_class($entity),
            ]);
            return;
        }

        // Bulk load preferences for all recipients (performance optimization)
        $userIds = $recipients->pluck('id')->toArray();
        $preferences = NotificationPreference::where('organization_id', $organizationId)
            ->where('type', $eventType)
            ->whereIn('user_id', $userIds)
            ->get()
            ->keyBy('user_id');

        $emailEligible = $this->isEmailEligible($eventType);
        $defaultFrequency = $this->defaultFrequency($eventType);

        foreach ($recipients as $recipient) {
            $preferenceModel = $preferences->get($recipient->id);
            $preference = [
                'in_app_enabled' => $preferenceModel?->in_app_enabled ?? true,
                'email_enabled' => $preferenceModel?->email_enabled ?? $emailEligible,
                'frequency' => $preferenceModel?->frequency ?? $defaultFrequency,
            ];

            if ($preference['in_app_enabled']) {
                $notification = Notification::create([
                    'organization_id' => $organizationId,
                    'user_id' => $recipient->id,
                    'event_id' => $event->id,
                    'title' => $payload['title'] ?? $this->buildTitle($eventType, $entity),
                    'body' => $payload['body'] ?? $this->buildBody($eventType, $entity, $payload),
                    'url' => $payload['url'] ?? null,
                    'level' => $this->resolveLevel($eventType, $payload),
                ]);

                if ($preference['email_enabled'] && $this->isEmailEligible($eventType) && $recipient->email) {
                    $this->queueDelivery($notification, $recipient->email, $preference['frequency'], null, $recipient->id);
                }
            } elseif ($preference['email_enabled'] && $this->isEmailEligible($eventType) && $recipient->email) {
                $notification = Notification::create([
                    'organization_id' => $organizationId,
                    'user_id' => $recipient->id,
                    'event_id' => $event->id,
                    'title' => $payload['title'] ?? $this->buildTitle($eventType, $entity),
                    'body' => $payload['body'] ?? $this->buildBody($eventType, $entity, $payload),
                    'url' => $payload['url'] ?? null,
                    'level' => $this->resolveLevel($eventType, $payload),
                    'read_at' => now(), // honor preference by not surfacing as unread in-app
                ]);

                $this->queueDelivery($notification, $recipient->email, $preference['frequency'], $event, $recipient->id);
            }
        }
    }

    private function getPreference(string $organizationId, string $userId, string $eventType): array
    {
        $preference = NotificationPreference::where('organization_id', $organizationId)
            ->where('user_id', $userId)
            ->where('type', $eventType)
            ->first();

        $emailEligible = $this->isEmailEligible($eventType);
        $defaultFrequency = $this->defaultFrequency($eventType);

        return [
            'in_app_enabled' => $preference?->in_app_enabled ?? true,
            'email_enabled' => $preference?->email_enabled ?? $emailEligible,
            'frequency' => $preference?->frequency ?? $defaultFrequency,
        ];
    }

    private function buildTitle(string $eventType, Model $entity): string
    {
        $title = Str::of($eventType)->replace('.', ' ')->headline();

        if (method_exists($entity, 'getAttribute') && $entity->getAttribute('title')) {
            $title = $entity->getAttribute('title');
        } elseif (method_exists($entity, 'getAttribute') && $entity->getAttribute('subject')) {
            $title = $entity->getAttribute('subject');
        }

        return (string) $title;
    }

    private function buildBody(string $eventType, Model $entity, array $payload): string
    {
        if (isset($payload['body'])) {
            return (string) $payload['body'];
        }

        $label = Str::of($eventType)->replace('.', ' ')->headline();
        $name = method_exists($entity, 'getAttribute') ? ($entity->getAttribute('full_name') ?? $entity->getAttribute('title') ?? $entity->getAttribute('subject')) : null;

        return trim("{$label} {$name}");
    }

    private function resolveLevel(string $eventType, array $payload): string
    {
        if (isset($payload['level'])) {
            return $payload['level'];
        }

        $levels = config('notifications.event_levels', []);

        return $levels[$eventType] ?? 'info';
    }

    private function queueDelivery(
        ?Notification $notification,
        string $email,
        string $frequency,
        ?NotificationEvent $event = null,
        ?string $userId = null
    ): void
    {
        $delivery = NotificationDelivery::create([
            'notification_id' => $notification?->id,
            'user_id' => $userId ?? $notification?->user_id,
            'event_id' => $event?->id ?? $notification?->event_id,
            'channel' => 'email',
            'to_address' => $email,
            'status' => 'queued',
        ]);

        if ($frequency === 'daily_digest') {
            SendNotificationDigestEmail::dispatch(
                $notification?->organization_id ?? $event?->organization_id,
                $notification?->user_id
            )->delay(now()->endOfDay());
            return;
        }

        SendNotificationEmail::dispatch($delivery->id);
    }

    private function isEmailEligible(string $eventType): bool
    {
        return in_array($eventType, config('notifications.email_eligible_events', []), true);
    }

    private function defaultFrequency(string $eventType): string
    {
        return in_array($eventType, config('notifications.digest_event_types', []), true)
            ? 'daily_digest'
            : 'instant';
    }
}
