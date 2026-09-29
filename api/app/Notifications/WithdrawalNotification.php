<?php

namespace App\Notifications;

use App\Models\WalletTransaction;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Emails the operator at each step of a withdrawal, and the platform admins
 * when one is waiting for manual release. Queued so a slow or failing mail
 * server can never hold up or break the money movement itself.
 */
class WithdrawalNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public const REQUESTED = 'requested';
    public const COMPLETED = 'completed';
    public const FAILED = 'failed';
    public const AWAITING_RELEASE = 'awaiting_release';

    public function __construct(
        private WalletTransaction $withdrawal,
        private string $event,
        private ?float $balanceAfter = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $w = $this->withdrawal;
        $tenant = $w->tenant;
        $currency = $tenant?->currency ?: 'UGX';
        $tz = $tenant?->timezone ?: config('app.timezone');

        $meta = $w->meta ?? [];
        $sent = (float) ($meta['net_payout'] ?? $w->amount);
        $fee = (float) ($meta['payout_fee'] ?? 0);
        $phone = $meta['phone'] ?? $tenant?->payout_phone;
        $provider = strtoupper((string) ($meta['provider'] ?? $tenant?->payout_provider ?? ''));

        $money = fn (float $v) => $currency . ' ' . number_format($v);
        $to = trim($phone . ($provider ? " ({$provider})" : ''));

        $mail = (new MailMessage)->greeting('Hello,');

        switch ($this->event) {
            case self::REQUESTED:
                $mail->subject("Withdrawal of {$money($sent)} is on its way")
                    ->line("We've received your withdrawal request and are sending **{$money($sent)}** to **{$to}**.")
                    ->line("You'll get another email as soon as it arrives.");
                break;

            case self::COMPLETED:
                $mail->subject("{$money($sent)} sent to {$phone}")
                    ->line("Your withdrawal is complete: **{$money($sent)}** has been sent to **{$to}**.");
                break;

            case self::FAILED:
                $mail->subject("Withdrawal of {$money($sent)} did not go through")
                    ->line("Your withdrawal of **{$money($sent)}** to **{$to}** could not be completed.")
                    ->line("**The full amount has been returned to your HotBill wallet** - nothing was lost. You can try again from your wallet.");
                break;

            case self::AWAITING_RELEASE:
                $mail->subject("Withdrawal awaiting release: {$money($sent)} - {$tenant?->name}")
                    ->line("**{$tenant?->name}** requested a withdrawal that needs to be released manually.")
                    ->line("Send **{$money($sent)}** to **{$to}**, then mark it as paid in the admin withdrawals page.");
                break;
        }

        $mail->line('**Details**');

        if ($this->event === self::FAILED) {
            $mail->line("Amount: {$money($sent)}")
                ->line("Refunded to your wallet: {$money($sent + $fee)} (amount + fee)");
        } else {
            $mail->line(($this->event === self::COMPLETED ? 'Amount sent: ' : 'Amount to send: ') . $money($sent))
                ->line("Withdrawal fee: {$money($fee)}")
                ->line("Total taken from wallet: {$money($sent + $fee)}");
        }

        $mail->line('Requested: ' . $w->created_at?->copy()->timezone($tz)->format('j M Y, g:ia'))
            ->line('Reference: ' . $w->reference);

        if ($this->balanceAfter !== null && $this->event !== self::AWAITING_RELEASE) {
            $mail->line("Wallet balance now: {$money($this->balanceAfter)}");
        }

        if ($this->event === self::REQUESTED) {
            $mail->line("**Didn't request this?** Change your password immediately - someone may have access to your account.");
        }

        return $mail->salutation('The HotBill Team');
    }
}
