<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BusinessController extends Controller
{
    /**
     * List every business this user can manage, flagging the active one.
     */
    public function index(Request $request): JsonResponse
    {
        return response()->json($this->businessesFor($request));
    }

    /**
     * Create a new (empty) hotspot business and make the user its admin.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
        ]);

        $user = $request->user();
        $home = $user->tenant; // inherit sensible defaults from the current business

        $tenant = Tenant::create([
            'name' => $data['name'],
            'slug' => Str::slug($data['name']) . '-' . substr(md5(microtime()), 0, 6),
            'email' => $user->email,
            'phone' => $user->phone,
            'currency' => $home->currency ?? 'UGX',
            'timezone' => $home->timezone ?? 'Africa/Kampala',
        ]);

        $user->tenants()->attach($tenant->id, ['role' => 'admin']);

        return response()->json([
            'id' => $tenant->id,
            'name' => $tenant->name,
            'currency' => $tenant->currency,
            'plan' => $tenant->plan,
            'routers_count' => 0,
            'is_active' => false,
        ], 201);
    }

    /**
     * Persist the user's last-used business so it survives re-login. Switching
     * itself is header-driven; this just updates the home/default fallback.
     */
    public function activate(Request $request, Tenant $tenant): JsonResponse
    {
        abort_unless($request->user()->belongsToTenant($tenant->id), 403);

        $request->user()->forceFill(['tenant_id' => $tenant->id])->save();

        return response()->json(['message' => 'Active business updated']);
    }

    /**
     * Shared shape for the business switcher.
     */
    public static function businessesFor(Request $request): array
    {
        $activeId = (int) $request->user()->tenant_id;

        return $request->user()->tenants()
            ->withCount('routers')
            ->orderBy('name')
            ->get()
            ->map(fn (Tenant $t) => [
                'id' => $t->id,
                'name' => $t->name,
                'currency' => $t->currency,
                'plan' => $t->plan,
                'routers_count' => $t->routers_count,
                'is_active' => $t->id === $activeId,
            ])
            ->all();
    }
}
