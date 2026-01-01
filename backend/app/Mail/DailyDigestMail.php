<?php

namespace App\Mail;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;

class DailyDigestMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
        * @param Collection<int, Notification> $notifications
        */
    public function __construct(
        public Collection $notifications,
        public User $user
    ) {
    }

    public function build(): self
    {
        return $this->subject('Nazim Daily Notification Digest')
            ->view('emails.daily_digest')
            ->with([
                'notifications' => $this->notifications,
                'user' => $this->user,
            ]);
    }
}
