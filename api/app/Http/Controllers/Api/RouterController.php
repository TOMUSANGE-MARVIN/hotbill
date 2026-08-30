<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Router;
use App\Models\RouterCommand;
use App\Models\RouterStat;
use App\Services\HotspotUsageRecorder;
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

        // Only report live metrics for routers that have sent a recent heartbeat.
        // A router that stopped reporting is offline — never show its last-known
        // CPU / users / memory / uptime as if they were current.
        $routers->each(function (Router $r) {
            if (! $r->isOnline()) {
                $r->status = 'offline';
                $r->cpu_load = null;
                $r->free_memory = null;
                $r->total_memory = null;
                $r->uptime = null;
                $r->active_users = 0;
            }
        });

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

        // Resolve which tunnel this router reaches us over, from its RouterOS
        // major version (heartbeat sends `osmajor`): v7 uses WireGuard, v6 uses
        // SSTP. Set once, when first known.
        $vpnType = $router->vpn_type;
        if (!$vpnType) {
            $major = (int) ($data['osmajor'] ?? $data['version'] ?? $router->ros_version);
            if ($major > 0) {
                $vpnType = $major >= 7 ? 'wireguard' : 'sstp';
            }
        }

        $router->update([
            'vpn_type' => $vpnType,
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

        // Pull real per-customer hotspot usage in the background (queue worker).
        // Only actually succeeds if the router's VPN tunnel is reachable — most
        // NAT/CGNAT routers rely on usageReport() below instead.
        \App\Jobs\CollectHotspotUsageJob::dispatch($router->id);

        return response()->json(['status' => 'ok']);
    }

    /**
     * NAT-safe usage reporting: the router's `hotbill-usage` scheduler builds
     * this itself from `/ip hotspot user print` + `/ip hotspot active print`
     * and posts it here every 5 minutes, over the same outbound HTTPS channel
     * as the heartbeat/command poller. Needed because CollectHotspotUsageJob's
     * direct API pull only works when the router's VPN tunnel is reachable,
     * which it usually isn't for CGNAT'd routers — those routers were never
     * getting any usage recorded at all before this existed.
     *
     * Payload: `data=<records>` where each record is `type|username|bytes_in|
     * bytes_out|uptime` separated by `;` — type `u` is a persistent hotspot
     * user's stored counters, `a` is an active session's live counters. Merged
     * the same way MikrotikService::getHotspotUsageSnapshot() does: a user's
     * total is stored + live, and they're "active" iff an `a` record exists.
     */
    public function usageReport(Request $request): JsonResponse
    {
        $token = $request->bearerToken();
        $router = Router::where('token', $token)->first();

        if (!$router) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $persistent = [];
        $live = [];

        foreach (array_filter(explode(';', (string) $request->input('data', ''))) as $entry) {
            $parts = explode('|', $entry);
            if (count($parts) !== 5) continue;
            [$type, $username, $bytesIn, $bytesOut, $uptime] = $parts;
            if ($username === '' || $username === 'default-trial') continue;

            $row = [
                'bytes_in' => (int) $bytesIn,
                'bytes_out' => (int) $bytesOut,
                'uptime' => MikrotikService::parseDuration($uptime),
            ];

            if ($type === 'a') {
                $live[$username] = $row;
            } else {
                $persistent[$username] = $row;
            }
        }

        $snapshot = [];
        $seen = [];
        foreach ($persistent as $username => $p) {
            $l = $live[$username] ?? ['bytes_in' => 0, 'bytes_out' => 0, 'uptime' => 0];
            $snapshot[] = [
                'username' => $username,
                'bytes_in' => $p['bytes_in'] + $l['bytes_in'],
                'bytes_out' => $p['bytes_out'] + $l['bytes_out'],
                'uptime_seconds' => $p['uptime'] + $l['uptime'],
                'active' => isset($live[$username]),
            ];
            $seen[$username] = true;
        }
        foreach ($live as $username => $l) {
            if (isset($seen[$username])) continue;
            $snapshot[] = [
                'username' => $username,
                'bytes_in' => $l['bytes_in'],
                'bytes_out' => $l['bytes_out'],
                'uptime_seconds' => $l['uptime'],
                'active' => true,
            ];
        }

        HotspotUsageRecorder::record($router, $snapshot);

        return response()->json(['status' => 'ok']);
    }

    /**
     * Poll endpoint (the XenFi model): the router's `hotbill-commands` scheduler
     * calls this over outbound HTTPS every ~30s and runs whatever RouterOS
     * script we return — so HotBill manages routers behind NAT without ever
     * reaching into them. Each pending command is wrapped so the router reports
     * success/failure back to us, then executed via [:parse] on the router.
     */
    public function commands(Request $request)
    {
        $token = $request->bearerToken();
        $router = Router::where('token', $token)->first();

        if (!$router) {
            return response('Unauthorized', 401);
        }

        $pending = RouterCommand::where('router_id', $router->id)
            ->where('status', 'pending')
            ->orderBy('id')
            ->get();

        if ($pending->isEmpty()) {
            return response('', 200)->header('Content-Type', 'text/plain');
        }

        $url = rtrim(config('app.url'), '/');
        $blocks = [];

        foreach ($pending as $cmd) {
            $doneUrl = "{$url}/api/v1/routers/commands/{$cmd->id}/result?status=done";
            $failUrl = "{$url}/api/v1/routers/commands/{$cmd->id}/result?status=failed";

            // Run the command body; on success or failure the router phones the
            // matching result URL so the dashboard reflects what actually happened.
            $blocks[] = <<<CMD
:do {
{$cmd->script}
/tool fetch url="{$doneUrl}" http-method=post http-header-field="Authorization: Bearer {$token}" keep-result=no
} on-error={
/tool fetch url="{$failUrl}" http-method=post http-header-field="Authorization: Bearer {$token}" keep-result=no
}
CMD;
        }

        // Mark delivered so we don't hand the same command out on the next poll.
        RouterCommand::whereIn('id', $pending->pluck('id'))
            ->update(['status' => 'sent', 'sent_at' => now()]);

        return response(implode("\n", $blocks) . "\n", 200)
            ->header('Content-Type', 'text/plain');
    }

    /**
     * The router reports the outcome of a command it pulled (done|failed).
     */
    public function commandResult(Request $request, RouterCommand $command)
    {
        $token = $request->bearerToken();
        $router = Router::where('token', $token)->first();

        if (!$router || $command->router_id !== $router->id) {
            return response('Unauthorized', 401);
        }

        $status = $request->query('status') === 'failed' ? 'failed' : 'done';

        $command->update([
            'status' => $status,
            'completed_at' => now(),
            'result' => $request->input('result'),
        ]);

        return response()->json(['status' => 'ok']);
    }

    public function stats(Request $request, Router $router): JsonResponse
    {
        $this->authorize_tenant($router, $request);

        $stats = RouterStat::where('router_id', $router->id)
            ->where('recorded_at', '>=', now()->subHours(24))
            ->orderBy('recorded_at')
            ->get(['cpu_load', 'free_memory', 'total_memory', 'active_users', 'data_rx', 'data_tx', 'recorded_at']);

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

    public function reboot(Request $request, Router $router): JsonResponse
    {
        $this->authorize_tenant($router, $request);

        try {
            $mikrotik = MikrotikService::connect_to($router);
            $mikrotik->reboot();
            try { $mikrotik->disconnect(); } catch (\Throwable $e) { /* socket already dropping */ }

            $router->update(['status' => 'offline']);
            return response()->json(['success' => true, 'message' => 'Reboot command sent']);
        } catch (\Exception $e) {
            // The router drops the API socket as it goes down — expected after reboot is issued.
            if (str_contains($e->getMessage(), 'connection closed')) {
                $router->update(['status' => 'offline']);
                return response()->json(['success' => true, 'message' => 'Reboot command sent']);
            }
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function updateAdminPassword(Request $request, Router $router): JsonResponse
    {
        $this->authorize_tenant($router, $request);

        $data = $request->validate([
            'username' => 'nullable|string',
            'password' => 'required|string|min:4',
        ]);

        $username = $data['username'] ?: 'admin';

        try {
            $mikrotik = MikrotikService::connect_to($router);
            $mikrotik->setUserPassword($username, $data['password']);
            $mikrotik->disconnect();

            // Keep stored credentials in sync if we changed the account HotBill connects with.
            if ($username === $router->api_username) {
                $router->update(['api_password' => $data['password']]);
            }

            return response()->json(['success' => true, 'message' => "Password updated for '{$username}'"]);
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
