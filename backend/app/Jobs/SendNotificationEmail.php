<?php

namespace App\Jobs;

use App\Mail\ActionRequiredMail;
use App\Models\NotificationDelivery;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendNotificationEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 60;

    public function __construct(public string $deliveryId)
    {
    }

    public function handle(): void
    {
        $delivery = NotificationDelivery::with(['notification', 'event'])->find($this->deliveryId);

        if (!$delivery) {
            Log::warning('Notification delivery not found', ['delivery_id' => $this->deliveryId]);
            return;
        }

        if ($delivery->status !== 'queued') {
            return;
        }

        try {
            Mail::to($delivery->to_address)->send(new ActionRequiredMail(
                $delivery->notification,
                $delivery->event
            ));

            $delivery->update([
                'status' => 'sent',
                'sent_at' => now(),
            ]);
        } catch (\Throwable $e) {
            $delivery->update([
                'status' => 'failed',
                'error' => $e->getMessage(),
            ]);

            Log::error('Failed to send notification email', [
                'delivery_id' => $delivery->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
