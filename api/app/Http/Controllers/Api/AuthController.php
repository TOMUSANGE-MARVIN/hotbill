<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
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

        return response()->json([
            'user' => $user,
            'tenant' => $tenant,
            'businesses' => BusinessController::businessesFor($request->merge([])->setUserResolver(fn () => $user)),
            'token' => $user->createToken('api')->plainTextToken,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $data['email'])->with('tenant')->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => 'Invalid credentials']);
        }

        if (!$user->is_active) {
            return response()->json(['message' => 'Account suspended'], 403);
        }

        return response()->json([
            'user' => $user,
            'tenant' => $user->tenant,
            'businesses' => BusinessController::businessesFor($request->setUserResolver(fn () => $user)),
            'token' => $user->createToken('api')->plainTextToken,
        ]);
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
