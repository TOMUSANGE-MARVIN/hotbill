<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Router;
use App\Models\RouterBridge;
use App\Models\RouterCommand;
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

        $networkCidr = $this->networkAddress($data['gateway_ip'], $data['subnet_prefix']) . '/' . $data['subnet_prefix'];

        // Poll model (XenFi-style): rather than reach into the router over a VPN
        // (which fails behind NAT), we queue the full bridge script. The router's
        // hotbill-commands poller pulls it over outbound HTTPS and applies it,
        // then reports back — so this works on any RouterOS behind any firewall.
        $script = $this->bridgeScript($bridge, $networkCidr);

        $command = RouterCommand::create([
            'router_id' => $router->id,
            'kind' => 'bridge',
            'label' => "Deploy bridge {$bridge->name}",
            'script' => $script,
            'status' => 'pending',
        ]);

        return response()->json([
            'bridge' => $bridge,
            'queued' => true,
            'command_id' => $command->id,
            'message' => 'Bridge configuration queued — the router will apply it within ~30 seconds.',
            // Kept so operators who prefer manual application can still paste it.
            'bootstrap_script' => $script,
        ]);
    }

    /**
     * Full, idempotent RouterOS script that creates the bridge, adds its ports,
     * assigns the gateway IP, and (optionally) stands up the DHCP + hotspot +
     * RADIUS + captive-portal walled garden — the script equivalent of what
     * MikrotikService used to do over the live API. Runs on RouterOS v6 and v7.
     */
    private function bridgeScript(RouterBridge $bridge, string $networkCidr): string
    {
        $name = $bridge->name;
        $gw = $bridge->gateway_ip;
        $cidr = $gw . '/' . $bridge->subnet_prefix;
        [$network, $prefix] = explode('/', $networkCidr);
        $rangeStart = $this->offsetIp($network, 2);
        $rangeEnd = $this->broadcastMinusOne($network, (int) $prefix);
        $pool = $name . '-pool';
        $profile = $name . '-profile';

        $lines = [];
        // Bridge (create if missing).
        $lines[] = ":if ([:len [/interface bridge find name=\"{$name}\"]] = 0) do={ /interface bridge add name=\"{$name}\" }";
        // Ports (add each if not already a member).
        foreach ($bridge->ports as $port) {
            $lines[] = ":if ([:len [/interface bridge port find bridge=\"{$name}\" interface=\"{$port}\"]] = 0) do={ /interface bridge port add bridge=\"{$name}\" interface=\"{$port}\" }";
        }
        // Gateway IP (reset any existing address on the bridge, then add).
        $lines[] = "/ip address remove [find interface=\"{$name}\"]";
        $lines[] = "/ip address add address={$cidr} interface=\"{$name}\"";

        if ($bridge->hotspot_enabled) {
            // IP pool.
            $lines[] = ":if ([:len [/ip pool find name=\"{$pool}\"]] = 0) do={ /ip pool add name=\"{$pool}\" ranges={$rangeStart}-{$rangeEnd} }";
            // DHCP server + network.
            $lines[] = ":if ([:len [/ip dhcp-server find interface=\"{$name}\"]] = 0) do={ /ip dhcp-server add name=\"{$name}-dhcp\" interface=\"{$name}\" address-pool=\"{$pool}\" lease-time=1h disabled=no }";
            $lines[] = ":if ([:len [/ip dhcp-server network find address=\"{$networkCidr}\"]] = 0) do={ /ip dhcp-server network add address={$networkCidr} gateway={$gw} dns-server=8.8.8.8,1.1.1.1 }";
            // Hotspot profile (http-pap/chap so the external portal can auto-login;
            // no dns-name so *.local mDNS never breaks the portal).
            $lines[] = ":if ([:len [/ip hotspot profile find name=\"{$profile}\"]] = 0) do={ /ip hotspot profile add name=\"{$profile}\" hotspot-address={$gw} dns-name=\"\" login-by=http-pap,http-chap } else={ /ip hotspot profile set [find name=\"{$profile}\"] dns-name=\"\" login-by=http-pap,http-chap }";
            // Hotspot server.
            $lines[] = ":if ([:len [/ip hotspot find interface=\"{$name}\"]] = 0) do={ /ip hotspot add name=\"{$name}-hotspot\" interface=\"{$name}\" address-pool=\"{$pool}\" profile=\"{$profile}\" disabled=no }";
            // RADIUS + captive portal walled garden.
            $lines[] = "/ip hotspot profile set [find name=\"{$profile}\"] use-radius=yes radius-accounting=yes";
            $lines[] = "/radius incoming set accept=yes port=3799";
            $lines[] = "/ip hotspot walled-garden remove [find comment=\"hotbill-portal\"]";
            $lines[] = "/ip hotspot walled-garden add dst-host=*hotbill* action=allow comment=\"hotbill-portal\"";
        }

        // NAT so the hotspot subnet reaches the internet.
        $lines[] = "/ip firewall nat remove [find comment=\"hotbill-masquerade-{$name}\"]";
        $lines[] = "/ip firewall nat add chain=srcnat src-address={$networkCidr} action=masquerade comment=\"hotbill-masquerade-{$name}\"";

        return implode("\n", $lines);
    }

    private function offsetIp(string $networkAddress, int $offset): string
    {
        return long2ip(ip2long($networkAddress) + $offset);
    }

    private function broadcastMinusOne(string $networkAddress, int $prefix): string
    {
        $long = ip2long($networkAddress);
        $broadcast = $long | ((1 << (32 - $prefix)) - 1);
        return long2ip($broadcast - 1);
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
