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
     * @param  Collection<int, Notification>  $notifications
     */
    public function __construct(
        public Collection $notifications,
        public User $user
    ) {}

    public function build(): self
    {
        $from = config('mail.from');
        $address = $from['address'] ?? 'noreply@nazim.local';
        $name = $from['name'] ?? config('app.name', 'Nazim');

        return $this->from($address, $name)
            ->subject('Nazim Daily Notification Digest')
            ->view('emails.daily_digest')
            ->with([
                'notifications' => $this->notifications,
                'user' => $this->user,
            ]);
    }
}
