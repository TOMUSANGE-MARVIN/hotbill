<?php

namespace App\Services;

use App\Models\EmailOtp;
use App\Models\TrustedDevice;
use App\Models\User;
use App\Notifications\EmailOtpNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class TwoFactorService
{
    /** How long an emailed code stays valid. */
    private const TTL_MINUTES = 10;

    /** Wrong-guess ceiling before a code is burned. */
    private const MAX_ATTEMPTS = 5;

    /** Minimum seconds between two code requests for the same purpose. */
    private const RESEND_COOLDOWN = 45;

    /** How long a "remember this device" trust lasts before 2FA is re-prompted. */
    private const TRUST_DAYS = 30;

    /**
     * Generate a fresh code for the user + purpose, email it, and return the
     * TTL (minutes). Throws a RuntimeException if a code was requested too
     * recently (resend cooldown).
     */
    public function sendCode(User $user, string $purpose): int
    {
        $recent = EmailOtp::where('user_id', $user->id)
            ->where('purpose', $purpose)
            ->whereNull('consumed_at')
            ->latest()
            ->first();

        if ($recent && $recent->created_at->gt(now()->subSeconds(self::RESEND_COOLDOWN))) {
            $wait = self::RESEND_COOLDOWN - now()->diffInSeconds($recent->created_at);
            throw new \RuntimeException("Please wait {$wait} seconds before requesting a new code.");
        }

        // Invalidate any outstanding codes for this purpose so only the newest works.
        EmailOtp::where('user_id', $user->id)
            ->where('purpose', $purpose)
            ->whereNull('consumed_at')
            ->update(['consumed_at' => now()]);

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        EmailOtp::create([
            'user_id' => $user->id,
            'purpose' => $purpose,
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(self::TTL_MINUTES),
        ]);

        $user->notify(new EmailOtpNotification($code, $purpose, self::TTL_MINUTES));

        return self::TTL_MINUTES;
    }

    /**
     * Verify a submitted code for the user + purpose. Returns true on success
     * and consumes the code; throws a RuntimeException with a user-facing
     * message on any failure.
     */
    public function verifyCode(User $user, string $purpose, string $code): bool
    {
        $otp = EmailOtp::where('user_id', $user->id)
            ->where('purpose', $purpose)
            ->whereNull('consumed_at')
            ->latest()
            ->first();

        if (!$otp) {
            throw new \RuntimeException('No active code. Please request a new one.');
        }

        if ($otp->isExpired()) {
            $otp->update(['consumed_at' => now()]);
            throw new \RuntimeException('This code has expired. Please request a new one.');
        }

        if ($otp->attempts >= self::MAX_ATTEMPTS) {
            $otp->update(['consumed_at' => now()]);
            throw new \RuntimeException('Too many incorrect attempts. Please request a new code.');
        }

        if (!Hash::check(trim($code), $otp->code_hash)) {
            $otp->increment('attempts');
            $left = self::MAX_ATTEMPTS - $otp->attempts;
            throw new \RuntimeException($left > 0
                ? "Incorrect code. {$left} attempt(s) left."
                : 'Too many incorrect attempts. Please request a new code.');
        }

        $otp->update(['consumed_at' => now()]);

        return true;
    }

    /**
     * Is the presented device token a currently-valid trust for this user?
     */
    public function isTrustedDevice(User $user, ?string $token): bool
    {
        if (!$token) return false;

        $device = TrustedDevice::where('user_id', $user->id)
            ->where('token_hash', hash('sha256', $token))
            ->where('expires_at', '>', now())
            ->first();

        if (!$device) return false;

        $device->update(['last_used_at' => now()]);

        return true;
    }

    /**
     * Remember this device so login 2FA is skipped for the trust window.
     * Returns the plaintext token to hand to the client (stored client-side).
     */
    public function trustDevice(User $user, Request $request): string
    {
        $token = Str::random(64);

        TrustedDevice::create([
            'user_id' => $user->id,
            'token_hash' => hash('sha256', $token),
            'label' => Str::limit((string) $request->userAgent(), 250, ''),
            'ip' => $request->ip(),
            'last_used_at' => now(),
            'expires_at' => now()->addDays(self::TRUST_DAYS),
        ]);

        return $token;
    }
}
