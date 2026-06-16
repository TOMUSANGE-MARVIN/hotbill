<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Router;
use App\Models\RouterBridge;
use App\Services\MikrotikService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class RouterSetupController extends Controller
{
    /**
     * Scan the router's live interface/bridge topology so the
     * setup wizard can render it.
     */
    public function topology(Request $request, Router $router): JsonResponse
    {
        $this->authorize_tenant($router, $request);

        try {
            $mikrotik = MikrotikService::connect_to($router);

            $resource = $mikrotik->getSystemResource();
            $identity = $mikrotik->getSystemIdentity();
            $wanInterfaces = $mikrotik->getWanInterfaces();

            $interfaces = collect($mikrotik->getInterfaces())
                ->filter(fn ($row) => isset($row['name']))
                ->map(fn ($row) => [
                    'name' => $row['name'],
                    'type' => $row['type'] ?? 'unknown',
                    'running' => ($row['running'] ?? 'false') === 'true',
                    'disabled' => ($row['disabled'] ?? 'false') === 'true',
                    'mac_address' => $row['mac-address'] ?? null,
                    // WAN/uplink ports are locked — bridging them drops internet + the tunnel.
                    'is_wan' => in_array($row['name'], $wanInterfaces, true),
                ])
                ->filter(fn ($row) => !in_array($row['type'], ['bridge', 'wg', 'loopback']))
                ->values();

            $bridgePorts = collect($mikrotik->getBridgePorts())
                ->filter(fn ($row) => isset($row['bridge'], $row['interface']));

            $bridges = collect($mikrotik->getBridges())
                ->filter(fn ($row) => isset($row['name']))
                ->map(fn ($row) => [
                    'name' => $row['name'],
                    'ports' => $bridgePorts->where('bridge', $row['name'])->pluck('interface')->values(),
                ])
                ->values();

            $mikrotik->disconnect();

            return response()->json([
                'identity' => $identity,
                'model' => $resource['board-name'] ?? null,
                'version' => $resource['version'] ?? null,
                'uptime' => $resource['uptime'] ?? null,
                'interfaces' => $interfaces,
                'bridges' => $bridges,
            ]);
        } catch (\Exception $e) {
            Log::warning('HotBill: topology fetch failed', ['router_id' => $router->id, 'error' => $e->getMessage()]);

            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Toggle (enable/disable) an interface — used to "activate"
     * the wireless interface from the topology designer.
     */
    public function toggleInterface(Request $request, Router $router): JsonResponse
    {
        $this->authorize_tenant($router, $request);

        $data = $request->validate([
            'name' => 'required|string',
            'enabled' => 'required|boolean',
        ]);

        try {
            $mikrotik = MikrotikService::connect_to($router);

            if ($data['enabled']) {
                $mikrotik->enableInterface($data['name']);
            } else {
                $mikrotik->disableInterface($data['name']);
            }

            $mikrotik->disconnect();

            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            Log::warning('HotBill: toggleInterface failed', ['router_id' => $router->id, 'error' => $e->getMessage()]);

            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * List previously deployed bridges for this router.
     */
    public function bridges(Request $request, Router $router): JsonResponse
    {
        $this->authorize_tenant($router, $request);

        return response()->json($router->bridges()->latest()->get());
    }

    /**
     * Create the bridge on the router (bridge interface, ports, IP
     * address, and optionally a hotspot server) and return the
     * follow-up RouterOS bootstrap script.
     */
    public function deployBridge(Request $request, Router $router): JsonResponse
    {
        $this->authorize_tenant($router, $request);

        $data = $request->validate([
            'name' => 'required|string|max:50',
            'gateway_ip' => 'required|ip',
            'subnet_prefix' => 'required|integer|min:8|max:30',
            'ports' => 'required|array|min:1',
            'ports.*' => 'string',
            'wlan_enabled' => 'boolean',
            'hotspot_enabled' => 'boolean',
            'pppoe_enabled' => 'boolean',
        ]);

        $bridge = RouterBridge::updateOrCreate(
            ['router_id' => $router->id, 'name' => $data['name']],
            [
                'gateway_ip' => $data['gateway_ip'],
                'subnet_prefix' => $data['subnet_prefix'],
                'ports' => $data['ports'],
                'wlan_enabled' => $data['wlan_enabled'] ?? false,
                'hotspot_enabled' => $data['hotspot_enabled'] ?? false,
                'pppoe_enabled' => $data['pppoe_enabled'] ?? false,
                'status' => 'pending',
                'deploy_error' => null,
            ]
        );

        try {
            $mikrotik = MikrotikService::connect_to($router);

            // Safety: never bridge the WAN/uplink port — it would drop the
            // router's internet and the management tunnel. Reject up-front,
            // before changing anything on the device.
            $wan = $mikrotik->getWanInterfaces();
            $badPorts = array_intersect($data['ports'], $wan);
            if (!empty($badPorts)) {
                $mikrotik->disconnect();
                $names = implode(', ', $badPorts);
                $bridge->update(['status' => 'failed', 'deploy_error' => "WAN port(s) cannot be bridged: {$names}"]);
                return response()->json([
                    'message' => "Cannot add the WAN/uplink port ({$names}) to a hotspot bridge — that would cut the router's internet. Remove it from the selected ports.",
                ], 422);
            }

            $mikrotik->addBridge($data['name']);

            foreach ($data['ports'] as $port) {
                $mikrotik->addBridgePort($data['name'], $port);
            }

            $cidr = $data['gateway_ip'] . '/' . $data['subnet_prefix'];
            $mikrotik->addIpAddress($cidr, $data['name']);

            $networkCidr = $this->networkAddress($data['gateway_ip'], $data['subnet_prefix']) . '/' . $data['subnet_prefix'];

            if ($data['hotspot_enabled'] ?? false) {
                $mikrotik->setupHotspot($data['name'], $networkCidr, $data['gateway_ip']);

                // Wire the HotBill captive portal (walled garden + login redirect).
                // Non-fatal: a failure here shouldn't fail the whole bridge deploy.
                try {
                    $portalHost = parse_url(config('hotbill.portal_url'), PHP_URL_HOST);
                    $apiHost = parse_url(config('app.url'), PHP_URL_HOST);
                    $loginUrl = rtrim(config('app.url'), '/') . '/api/v1/portal/routers/' . $router->id . '/login.html';
                    $mikrotik->configureCaptivePortal($loginUrl, array_filter([
                        $portalHost,
                        $apiHost,
                        '*.pesapal.com',
                        'pesapal.com',
                    ]));
                } catch (\Throwable $e) {
                    Log::warning('HotBill: captive portal config failed (bridge still deployed)', [
                        'router_id' => $router->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            $mikrotik->disconnect();

            $bridge->update(['status' => 'deployed', 'deployed_at' => now()]);

            return response()->json([
                'bridge' => $bridge,
                'bootstrap_script' => $this->bootstrapScript($bridge, $networkCidr),
            ]);
        } catch (\Exception $e) {
            Log::error('HotBill: bridge deployment failed', [
                'router_id' => $router->id,
                'bridge' => $data['name'],
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            $bridge->update(['status' => 'failed', 'deploy_error' => $e->getMessage()]);

            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Re-fetch the bootstrap script for an already-deployed bridge
     * (e.g. if the user re-opens the final modal).
     */
    public function bootstrapScriptFor(Request $request, Router $router, RouterBridge $bridge): JsonResponse
    {
        $this->authorize_tenant($router, $request);
        abort_if($bridge->router_id !== $router->id, 403);

        $networkCidr = $this->networkAddress($bridge->gateway_ip, $bridge->subnet_prefix) . '/' . $bridge->subnet_prefix;

        return response()->json(['bootstrap_script' => $this->bootstrapScript($bridge, $networkCidr)]);
    }

    private function bootstrapScript(RouterBridge $bridge, string $networkCidr): string
    {
        $profileName = $bridge->name . '-profile';

        $lines = [
            '/ip firewall nat remove [find comment="hotbill-masquerade-' . $bridge->name . '"]',
            '/ip firewall nat add chain=srcnat src-address=' . $networkCidr . ' action=masquerade comment="hotbill-masquerade-' . $bridge->name . '"',
        ];

        if ($bridge->hotspot_enabled) {
            $lines[] = '/ip hotspot profile set [find name="' . $profileName . '"] use-radius=yes radius-accounting=yes';
            $lines[] = '/radius incoming set accept=yes port=3799';
            $lines[] = '/ip hotspot walled-garden remove [find comment="hotbill-portal"]';
            $lines[] = '/ip hotspot walled-garden add dst-host=*hotbill* action=allow comment="hotbill-portal"';
        }

        $lines[] = ':put "HotBill bootstrap complete"';

        return implode("\n", $lines);
    }

    private function networkAddress(string $ip, int $prefix): string
    {
        $ipLong = ip2long($ip);
        $mask = $prefix === 0 ? 0 : (-1 << (32 - $prefix));
        return long2ip($ipLong & $mask);
    }

    private function authorize_tenant(Router $router, Request $request): void
    {
        abort_if($router->tenant_id !== $request->user()->tenant_id, 403);
    }
}
