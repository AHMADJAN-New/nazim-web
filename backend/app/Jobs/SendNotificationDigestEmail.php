<?php

namespace App\Jobs;

use App\Mail\DailyDigestMail;
use App\Models\NotificationDelivery;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendNotificationDigestEmail implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;
    public int $timeout = 120;

    public function __construct(
        public ?string $organizationId,
        public ?string $userId
    ) {
    }

    public function uniqueId(): string
    {
        return implode(':', [
            $this->organizationId ?? 'org',
            $this->userId ?? 'user',
            now()->toDateString(),
        ]);
    }

    public function handle(): void
    {
        if (!$this->organizationId || !$this->userId) {
            return;
        }

        $digestEvents = config('notifications.digest_event_types', []);

        $deliveries = NotificationDelivery::with(['notification', 'event'])
            ->where('status', 'queued')
            ->where(function ($query) {
                $query->where('user_id', $this->userId)
                    ->orWhereHas('notification', function ($notificationQuery) {
                        $notificationQuery->where('organization_id', $this->organizationId)
                            ->where('user_id', $this->userId);
                    });
            })
            ->whereHas('event', function ($query) use ($digestEvents) {
                $query->whereIn('type', $digestEvents);
            })
            ->get();

        if ($deliveries->isEmpty()) {
            return;
        }

        $user = User::find($this->userId);

        if (!$user || !$user->email) {
            return;
        }

        try {
            Mail::to($user->email)->send(new DailyDigestMail(
                $deliveries->pluck('notification')->filter(),
                $user
            ));

            $deliveries->each(function (NotificationDelivery $delivery) {
                $delivery->update([
                    'status' => 'sent',
                    'sent_at' => now(),
                ]);
            });
        } catch (\Throwable $e) {
            $deliveries->each(function (NotificationDelivery $delivery) use ($e) {
                $delivery->update([
                    'status' => 'failed',
                    'error' => $e->getMessage(),
                ]);
            });

            Log::error('Failed to send daily digest', [
                'organization_id' => $this->organizationId,
                'user_id' => $this->userId,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
