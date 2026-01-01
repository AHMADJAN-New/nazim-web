<?php

namespace App\Mail;

use App\Models\Notification;
use App\Models\NotificationEvent;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ActionRequiredMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public ?Notification $notification,
        public ?NotificationEvent $event
    ) {
    }

    public function build(): self
    {
        return $this->subject($this->notification?->title ?? 'Nazim Notification')
            ->view('emails.action_required')
            ->with([
                'notification' => $this->notification,
                'event' => $this->event,
                'payload' => $this->event?->payload_json ?? [],
            ]);
    }
}
