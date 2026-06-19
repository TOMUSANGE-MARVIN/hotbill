<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
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
