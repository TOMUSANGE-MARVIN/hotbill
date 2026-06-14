<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Router;
use App\Models\RouterStat;
use App\Services\MikrotikService;
use App\Services\RadiusService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RouterController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $routers = Router::where('tenant_id', $request->user()->tenant_id)
            ->withCount('subscribers')
            ->latest()
            ->get();

        return response()->json($routers);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string',
            'ip_address' => 'nullable|ip',
            'api_port' => 'nullable|integer',
            'api_username' => 'nullable|string',
            'api_password' => 'nullable|string',
        ]);

        $router = Router::create(array_merge($data, [
            'tenant_id' => $request->user()->tenant_id,
        ]));

        try {
            $router->provisionVpn();
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('VPN provisioning deferred', [
                'router_id' => $router->id,
                'error' => $e->getMessage(),
            ]);
        }

        // Register as NAS for RADIUS
        if ($router->ip_address) {
            app(RadiusService::class)->registerNas(
                $router->ip_address,
                $router->radius_secret,
                $router->name
            );
        }

        return response()->json($router, 201);
    }

    public function show(Request $request, Router $router): JsonResponse
    {
        $this->authorize_tenant($router, $request);
        return response()->json($router->load('stats'));
    }

    public function update(Request $request, Router $router): JsonResponse
    {
        $this->authorize_tenant($router, $request);

        $data = $request->validate([
            'name' => 'sometimes|string|max:100',
            'description' => 'nullable|string',
            'ip_address' => 'nullable|ip',
            'api_port' => 'nullable|integer',
            'api_username' => 'nullable|string',
            'api_password' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
        ]);

        $router->update($data);
        return response()->json($router);
    }

    public function destroy(Request $request, Router $router): JsonResponse
    {
        $this->authorize_tenant($router, $request);
        app(RadiusService::class)->removeNas($router->ip_address ?? '');

        if (config('hotbill.wireguard.enabled')) {
            try {
                app(\App\Services\WireguardService::class)->removePeerConfig($router);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Failed to remove WireGuard peer config', [
                    'router_id' => $router->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $router->delete();
        return response()->json(['message' => 'Deleted']);
    }

    public function script(Request $request, Router $router): JsonResponse
    {
        $this->authorize_tenant($router, $request);
        return response()->json(['script' => $router->script]);
    }

    // Fetched by the router itself via /tool fetch (Bearer token, not Sanctum)
    public function installScript(Request $request)
    {
        $token = $request->bearerToken();
        $router = Router::where('token', $token)->first();

        if (!$router) {
            return response('Unauthorized', 401);
        }

        return response($router->provision_script, 200)
            ->header('Content-Type', 'text/plain');
    }

    // Called by MikroTik scheduler script every 60s
    public function heartbeat(Request $request): JsonResponse
    {
        $token = $request->bearerToken();
        $router = Router::where('token', $token)->first();

        if (!$router) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $data = $request->all();

        $router->update([
            'cpu_load' => $data['cpu'] ?? null,
            'free_memory' => $data['memory'] ?? null,
            'total_memory' => $data['total_memory'] ?? null,
            'uptime' => $data['uptime'] ?? null,
            'active_users' => $data['active_users'] ?? 0,
            'data_rx' => $data['rx'] ?? $router->data_rx,
            'data_tx' => $data['tx'] ?? $router->data_tx,
            'identity' => $data['identity'] ?? $router->identity,
            'ros_version' => $data['version'] ?? $router->ros_version,
            'ip_address' => !empty($data['ip']) ? $data['ip'] : $router->ip_address,
            'status' => 'online',
            'last_seen_at' => now(),
        ]);

        RouterStat::create([
            'router_id' => $router->id,
            'cpu_load' => $data['cpu'] ?? null,
            'free_memory' => $data['memory'] ?? null,
            'total_memory' => $data['total_memory'] ?? null,
            'active_users' => $data['active_users'] ?? 0,
            'data_rx' => $data['rx'] ?? 0,
            'data_tx' => $data['tx'] ?? 0,
            'uptime' => $data['uptime'] ?? null,
            'recorded_at' => now(),
        ]);

        return response()->json(['status' => 'ok']);
    }

    public function stats(Request $request, Router $router): JsonResponse
    {
        $this->authorize_tenant($router, $request);

        $stats = RouterStat::where('router_id', $router->id)
            ->where('recorded_at', '>=', now()->subHours(24))
            ->orderBy('recorded_at')
            ->get(['cpu_load', 'active_users', 'data_rx', 'data_tx', 'recorded_at']);

        return response()->json($stats);
    }

    public function testConnection(Request $request, Router $router): JsonResponse
    {
        $this->authorize_tenant($router, $request);

        try {
            $mikrotik = MikrotikService::connect_to($router);
            $resource = $mikrotik->getSystemResource();
            $identity = $mikrotik->getSystemIdentity();
            $mikrotik->disconnect();

            $router->update([
                'identity' => $identity,
                'ros_version' => $resource['version'] ?? null,
                'status' => 'online',
                'last_seen_at' => now(),
            ]);

            return response()->json(['success' => true, 'identity' => $identity, 'resource' => $resource]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function remoteCommand(Request $request, Router $router): JsonResponse
    {
        $this->authorize_tenant($router, $request);

        $data = $request->validate([
            'command' => 'required|string',
            'attributes' => 'nullable|array',
        ]);

        try {
            $mikrotik = MikrotikService::connect_to($router);
            $result = $mikrotik->command($data['command'], $data['attributes'] ?? []);
            $mikrotik->disconnect();
            return response()->json(['result' => $result]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    private function authorize_tenant(Router $router, Request $request): void
    {
        abort_if($router->tenant_id !== $request->user()->tenant_id, 403);
    }
}
