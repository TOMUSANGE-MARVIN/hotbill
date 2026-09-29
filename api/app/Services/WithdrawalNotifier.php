<?php

namespace App\Services;

use App\Models\User;
use App\Models\WalletTransaction;
use App\Notifications\WithdrawalNotification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class WithdrawalNotifier
{
    /**
     * The business's contact email plus every admin of it (owners who joined
     * through the tenant_user pivot as well as the original account).
     */
    public function operatorEmails(WalletTransaction $withdrawal): array
    {
        $tenant = $withdrawal->tenant;
        if (!$tenant) {
            return [];
        }

        $members = User::where('is_active', true)
            ->where(function ($q) use ($tenant) {
                $q->where(fn ($q) => $q->where('tenant_id', $tenant->id)->where('role', 'admin'))
                    ->orWhereHas('tenants', fn ($q) => $q->where('tenants.id', $tenant->id)->where('tenant_user.role', 'admin'));
            })
            ->pluck('email');

        return $members->push($tenant->email)
            ->filter(fn ($e) => $e && filter_var($e, FILTER_VALIDATE_EMAIL))
            ->map(fn ($e) => strtolower($e))
            ->unique()
            ->values()
            ->all();
    }

    public function notifyOperator(WalletTransaction $withdrawal, string $event): void
    {
        $balance = $withdrawal->tenant?->fresh()?->wallet_balance;

        $this->send($this->operatorEmails($withdrawal), new WithdrawalNotification(
            $withdrawal, $event, $balance !== null ? (float) $balance : null,
        ), $withdrawal, $event);
    }

    /**
     * With auto-payouts off a withdrawal just sits 'pending' until someone
     * releases it by hand - make sure someone actually knows it's there.
     */
    public function notifyPlatformAdmins(WalletTransaction $withdrawal): void
    {
        $emails = User::where('role', 'super_admin')->where('is_active', true)->pluck('email')->all();

        $this->send($emails, new WithdrawalNotification($withdrawal, WithdrawalNotification::AWAITING_RELEASE), $withdrawal, 'awaiting_release');
    }

    /**
     * Never lets a mail problem escape into the payout flow - the money has
     * already moved by the time we get here.
     */
    private function send(array $emails, WithdrawalNotification $notification, WalletTransaction $withdrawal, string $event): void
    {
        foreach ($emails as $email) {
            try {
                Notification::route('mail', $email)->notify($notification);
            } catch (\Throwable $e) {
                Log::error('Withdrawal email could not be queued', [
                    'withdrawal_id' => $withdrawal->id, 'event' => $event, 'email' => $email, 'error' => $e->getMessage(),
                ]);
            }
        }
    }
}
