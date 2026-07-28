<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TwoFactorService;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(private TwoFactorService $twoFactor) {}

    /**
     * Create the workspace + owner account, but leave it unverified and issue
     * NO token. A 6-digit code is emailed; the account is activated only once
     * that code is confirmed via verifyEmail().
     */
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'tenant_name' => 'required|string|max:100',
            'name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'phone' => 'nullable|string',
        ]);

        $slug = \Str::slug($data['tenant_name']) . '-' . substr(md5(microtime()), 0, 6);

        $tenant = Tenant::create([
            'name' => $data['tenant_name'],
            'slug' => $slug,
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
        ]);

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'phone' => $data['phone'] ?? null,
            'role' => 'admin',
        ]);

        // Membership for the first business (multi-location support).
        $user->tenants()->attach($tenant->id, ['role' => 'admin']);

        $ttl = $this->twoFactor->sendCode($user, 'register');

        return response()->json([
            'requires_verification' => true,
            'email' => $user->email,
            'code_ttl_minutes' => $ttl,
            'message' => "We've sent a 6-digit verification code to {$user->email}.",
        ], 201);
    }

    /**
     * Confirm the registration code, mark the email verified, and return the
     * full authenticated payload (token) so the new user is signed in.
     */
    public function verifyEmail(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => 'required|email',
            'code' => 'required|string',
            'remember_device' => 'sometimes|boolean',
        ]);

        $user = User::where('email', $data['email'])->first();
        if (!$user) {
            throw ValidationException::withMessages(['email' => 'No account found for that email.']);
        }

        try {
            $this->twoFactor->verifyCode($user, 'register', $data['code']);
        } catch (\RuntimeException $e) {
            throw ValidationException::withMessages(['code' => $e->getMessage()]);
        }

        if (!$user->email_verified_at) {
            $user->forceFill(['email_verified_at' => now()])->save();
        }

        $deviceToken = ($data['remember_device'] ?? false)
            ? $this->twoFactor->trustDevice($user, $request)
            : null;

        return response()->json($this->authPayload($user, $request, $deviceToken));
    }

    /**
     * Verify credentials, then branch:
     *  - email not verified  → resend registration code (requires_verification)
     *  - device already trusted → sign in directly
     *  - otherwise → email a login code (requires_otp)
     */
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
            'device_token' => 'sometimes|nullable|string',
        ]);

        $user = User::where('email', $data['email'])->with('tenant')->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => 'Invalid credentials']);
        }

        if (!$user->is_active) {
            return response()->json(['message' => 'Account suspended'], 403);
        }

        // Unverified accounts must complete email verification before signing in.
        if (!$user->email_verified_at) {
            $ttl = $this->safeSend($user, 'register');
            return response()->json([
                'requires_verification' => true,
                'email' => $user->email,
                'code_ttl_minutes' => $ttl,
                'message' => "Please verify your email. We've sent a code to {$user->email}.",
            ], 200);
        }

        // Trusted device → skip the emailed code (this is the "periodic" part).
        if ($this->twoFactor->isTrustedDevice($user, $data['device_token'] ?? null)) {
            return response()->json($this->authPayload($user, $request));
        }

        $ttl = $this->safeSend($user, 'login');

        return response()->json([
            'requires_otp' => true,
            'email' => $user->email,
            'code_ttl_minutes' => $ttl,
            'message' => "For your security, we've sent a sign-in code to {$user->email}.",
        ], 200);
    }

    /**
     * Confirm a login 2FA code and return the authenticated payload. Optionally
     * remembers the device so future logins from it skip the code.
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => 'required|email',
            'code' => 'required|string',
            'remember_device' => 'sometimes|boolean',
        ]);

        $user = User::where('email', $data['email'])->with('tenant')->first();
        if (!$user) {
            throw ValidationException::withMessages(['email' => 'No account found for that email.']);
        }

        try {
            $this->twoFactor->verifyCode($user, 'login', $data['code']);
        } catch (\RuntimeException $e) {
            throw ValidationException::withMessages(['code' => $e->getMessage()]);
        }

        $deviceToken = ($data['remember_device'] ?? false)
            ? $this->twoFactor->trustDevice($user, $request)
            : null;

        return response()->json($this->authPayload($user, $request, $deviceToken));
    }

    /**
     * Re-send a code for the given purpose. Returns a generic response even if
     * the account doesn't exist, so it can't be used to probe for emails.
     */
    public function resendCode(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => 'required|email',
            'purpose' => 'required|in:register,login',
        ]);

        $user = User::where('email', $data['email'])->first();

        if ($user) {
            // Don't re-send a registration code to an already-verified account.
            $purpose = $data['purpose'];
            if ($purpose === 'register' && $user->email_verified_at) {
                $purpose = null;
            }
            if ($purpose) {
                try {
                    $this->twoFactor->sendCode($user, $purpose);
                } catch (\RuntimeException $e) {
                    return response()->json(['message' => $e->getMessage()], 429);
                }
            }
        }

        return response()->json([
            'message' => 'If an account exists for that email, a new code has been sent.',
        ]);
    }

    /**
     * Send a code, swallowing the resend-cooldown error so a rapid login retry
     * still returns cleanly (the existing, still-valid code remains usable).
     */
    private function safeSend(User $user, string $purpose): ?int
    {
        try {
            return $this->twoFactor->sendCode($user, $purpose);
        } catch (\RuntimeException $e) {
            return null;
        }
    }

    /** Build the standard authenticated response (issues an API token). */
    private function authPayload(User $user, Request $request, ?string $deviceToken = null): array
    {
        $user->load('tenant');

        return [
            'user' => $user,
            'tenant' => $user->tenant,
            'businesses' => BusinessController::businessesFor($request->setUserResolver(fn () => $user)),
            'token' => $user->createToken('api')->plainTextToken,
            'device_token' => $deviceToken,
        ];
    }

    /**
     * Send a password-reset link to the user's email. Always returns a generic
     * success message so the response can't be used to discover which emails
     * have accounts (no user enumeration).
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);

        Password::sendResetLink($request->only('email'));

        return response()->json([
            'message' => 'If an account exists for that email, a reset link has been sent.',
        ]);
    }

    /**
     * Reset the password using the emailed token. The token + email come back
     * from the frontend reset page (link target set in AppServiceProvider).
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token' => 'required|string',
            'email' => 'required|email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                // Revoke existing API tokens so old sessions can't keep the
                // account after a password reset.
                $user->tokens()->delete();

                event(new PasswordReset($user));
            }
        );

        if ($status !== Password::PasswordReset) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        return response()->json(['message' => 'Your password has been reset. You can now sign in.']);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('tenant');

        return response()->json([
            'user' => $user,
            'tenant' => $user->tenant,
            'businesses' => BusinessController::businessesFor($request),
        ]);
    }
}
