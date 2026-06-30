<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Password-reset links must point at the frontend reset page (this is an
        // API + SPA, not server-rendered), and carry the token + email it needs.
        ResetPassword::createUrlUsing(function ($notifiable, string $token) {
            $base = rtrim(config('hotbill.portal_url'), '/');
            return $base . '/reset-password?token=' . $token
                . '&email=' . urlencode($notifiable->getEmailForPasswordReset());
        });

        // Branded reset email.
        ResetPassword::toMailUsing(function ($notifiable, string $token) {
            $url = rtrim(config('hotbill.portal_url'), '/') . '/reset-password?token=' . $token
                . '&email=' . urlencode($notifiable->getEmailForPasswordReset());
            $expire = config('auth.passwords.' . config('auth.defaults.passwords') . '.expire', 60);

            return (new MailMessage)
                ->subject('Reset your HotBill password')
                ->greeting('Hello,')
                ->line('We received a request to reset the password for your HotBill account.')
                ->action('Reset Password', $url)
                ->line("This link will expire in {$expire} minutes.")
                ->line('If you did not request a password reset, no action is needed — your password stays the same.')
                ->salutation('— The HotBill Team');
        });
    }
}
