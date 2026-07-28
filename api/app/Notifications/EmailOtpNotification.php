<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EmailOtpNotification extends Notification
{
    use Queueable;

    /**
     * @param  string  $code      the plaintext 6-digit code (never persisted)
     * @param  string  $purpose   'register' | 'login'
     * @param  int     $ttlMinutes  how long the code stays valid
     */
    public function __construct(
        private string $code,
        private string $purpose,
        private int $ttlMinutes,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $isRegister = $this->purpose === 'register';

        $subject = $isRegister
            ? 'Verify your HotBill email'
            : 'Your HotBill sign-in code';

        $intro = $isRegister
            ? 'Welcome to HotBill! Use the code below to verify your email and activate your account.'
            : 'Use the code below to finish signing in to your HotBill account.';

        return (new MailMessage)
            ->subject($subject)
            ->greeting('Hello,')
            ->line($intro)
            ->line('**Your verification code is:**')
            ->line("# {$this->code}")
            ->line("This code expires in {$this->ttlMinutes} minutes.")
            ->line($isRegister
                ? 'If you did not create a HotBill account, you can safely ignore this email.'
                : 'If you did not try to sign in, please change your password immediately — someone may have it.')
            ->salutation('— The HotBill Team');
    }
}
