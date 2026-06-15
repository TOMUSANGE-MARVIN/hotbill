<?php

namespace App\Services;

use App\Models\Router;
use Exception;

class MikrotikService
{
    private $socket;
    private Router $router;

    public function __construct(Router $router)
    {
        $this->router = $router;
    }

    public function connect(): void
    {
        $host = $this->router->vpn_ip ?: $this->router->ip_address;

        $this->socket = @fsockopen(
            $host,
            $this->router->api_port,
            $errno,
            $errstr,
            10
        );

        if (!$this->socket) {
            throw new Exception("Cannot connect to router: {$errstr} ({$errno})");
        }

        $this->login($this->router->api_username, $this->router->api_password);
    }

    public function disconnect(): void
    {
        if ($this->socket) {
            $this->write(['/quit']);
            fclose($this->socket);
        }
    }

    private function login(string $username, string $password): void
    {
        $this->command('/login', [
            '=name=' . $username,
            '=password=' . $password,
        ]);
    }

    public function command(string $command, array $attributes = []): array
    {
        $this->write(array_merge([$command], $attributes));
        $response = $this->read();

        foreach ($response as $sentence) {
            if (($sentence['type'] ?? null) === '!trap') {
                throw new Exception($sentence['message'] ?? "RouterOS rejected command: {$command}");
            }
        }

        return $response;
    }

    /**
     * Filter a print response down to its data rows (!re sentences),
     * discarding the trailing !done status sentence.
     */
    private function rows(array $response): array
    {
        return array_values(array_filter($response, fn ($row) => ($row['type'] ?? null) === '!re'));
    }

    private function write(array $words): void
    {
        foreach ($words as $word) {
            $len = strlen($word);
            if ($len < 0x80) {
                fwrite($this->socket, chr($len));
            } elseif ($len < 0x4000) {
                $len |= 0x8000;
                fwrite($this->socket, chr(($len >> 8) & 0xFF) . chr($len & 0xFF));
            } else {
                $len |= 0xC00000;
                fwrite($this->socket, chr(($len >> 16) & 0xFF) . chr(($len >> 8) & 0xFF) . chr($len & 0xFF));
            }
            fwrite($this->socket, $word);
        }
        fwrite($this->socket, chr(0)); // end of sentence
    }

    /**
     * Reads one full reply: a sequence of sentences (each a list of
     * words terminated by a zero-length word), ending with the
     * sentence whose first word is !done.
     */
    private function read(): array
    {
        $response = [];

        while (true) {
            $sentence = [];
            $done = false;

            while (true) {
                $len = $this->readLength();
                if ($len === 0) break;

                $word = $this->readBytes($len);

                if ($word === '!done') {
                    $done = true;
                }

                if (str_starts_with($word, '!')) {
                    $sentence['type'] = $word;
                } elseif (str_starts_with($word, '=')) {
                    [$key, $value] = explode('=', substr($word, 1), 2) + [1 => ''];
                    $sentence[$key] = $value;
                }
            }

            if (!empty($sentence)) {
                $response[] = $sentence;
            }

            if ($done) break;
        }

        return $response;
    }

    private function readLength(): int
    {
        $b = ord($this->readBytes(1));
        if ($b < 0x80) return $b;
        if ($b < 0xC0) {
            $b2 = ord($this->readBytes(1));
            return (($b & ~0x80) << 8) | $b2;
        }
        if ($b < 0xE0) {
            $b2 = ord($this->readBytes(1));
            $b3 = ord($this->readBytes(1));
            return (($b & ~0xC0) << 16) | ($b2 << 8) | $b3;
        }
        $b2 = ord($this->readBytes(1));
        $b3 = ord($this->readBytes(1));
        $b4 = ord($this->readBytes(1));
        return (($b & ~0xE0) << 24) | ($b2 << 16) | ($b3 << 8) | $b4;
    }

    private function readBytes(int $length): string
    {
        $data = '';
        while (strlen($data) < $length) {
            $chunk = fread($this->socket, $length - strlen($data));
            if ($chunk === '' || $chunk === false) {
                throw new Exception('RouterOS connection closed unexpectedly while reading response');
            }
            $data .= $chunk;
        }
        return $data;
    }

    // ── High-level helpers ──────────────────────────────────────

    public function getHotspotUsers(): array
    {
        return $this->command('/ip/hotspot/user/print');
    }

    public function getActiveHotspotSessions(): array
    {
        return $this->command('/ip/hotspot/active/print');
    }

    public function addHotspotUser(string $username, string $password, ?string $profile = null): array
    {
        $attrs = [
            '=name=' . $username,
            '=password=' . $password,
        ];
        if ($profile) $attrs[] = '=profile=' . $profile;
        return $this->command('/ip/hotspot/user/add', $attrs);
    }

    public function removeHotspotUser(string $username): array
    {
        $users = $this->command('/ip/hotspot/user/print', ['?name=' . $username]);
        foreach ($users as $user) {
            if (isset($user['.id'])) {
                $this->command('/ip/hotspot/user/remove', ['=.id=' . $user['.id']]);
            }
        }
        return [];
    }

    public function kickHotspotSession(string $username): void
    {
        $sessions = $this->command('/ip/hotspot/active/print', ['?user=' . $username]);
        foreach ($sessions as $session) {
            if (isset($session['.id'])) {
                $this->command('/ip/hotspot/active/remove', ['=.id=' . $session['.id']]);
            }
        }
    }

    public function getPppoeSecrets(): array
    {
        return $this->command('/ppp/secret/print');
    }

    public function addPppoeSecret(string $username, string $password, ?string $profile = null): array
    {
        $attrs = [
            '=name=' . $username,
            '=password=' . $password,
            '=service=pppoe',
        ];
        if ($profile) $attrs[] = '=profile=' . $profile;
        return $this->command('/ppp/secret/add', $attrs);
    }

    public function removePppoeSecret(string $username): void
    {
        $secrets = $this->command('/ppp/secret/print', ['?name=' . $username]);
        foreach ($secrets as $s) {
            if (isset($s['.id'])) {
                $this->command('/ppp/secret/remove', ['=.id=' . $s['.id']]);
            }
        }
    }

    public function getSystemResource(): array
    {
        $result = $this->command('/system/resource/print');
        return $result[0] ?? [];
    }

    public function getSystemIdentity(): string
    {
        $result = $this->command('/system/identity/print');
        return $result[0]['name'] ?? 'unknown';
    }

    public function addHotspotProfile(string $name, string $rateLimit): array
    {
        return $this->command('/ip/hotspot/user/profile/add', [
            '=name=' . $name,
            '=rate-limit=' . $rateLimit,
        ]);
    }

    // ── Topology / setup wizard helpers ─────────────────────────

    public function getInterfaces(): array
    {
        return $this->command('/interface/print');
    }

    public function getBridges(): array
    {
        return $this->command('/interface/bridge/print');
    }

    public function getBridgePorts(): array
    {
        return $this->command('/interface/bridge/port/print');
    }

    public function findInterfaceId(string $name): ?string
    {
        $interfaces = $this->command('/interface/print', ['?name=' . $name]);
        return $interfaces[0]['.id'] ?? null;
    }

    public function enableInterface(string $name): void
    {
        $id = $this->findInterfaceId($name);
        if ($id) {
            $this->command('/interface/enable', ['=numbers=' . $id]);
        }
    }

    public function disableInterface(string $name): void
    {
        $id = $this->findInterfaceId($name);
        if ($id) {
            $this->command('/interface/disable', ['=numbers=' . $id]);
        }
    }

    public function addBridge(string $name): string
    {
        $existing = $this->command('/interface/bridge/print', ['?name=' . $name]);
        if (!empty($existing[0]['.id'])) {
            return $existing[0]['.id'];
        }

        $result = $this->command('/interface/bridge/add', ['=name=' . $name]);
        foreach ($result as $row) {
            if (isset($row['ret'])) return $row['ret'];
        }

        return $this->findInterfaceId($name) ?? '';
    }

    public function addBridgePort(string $bridge, string $interface): void
    {
        $existing = $this->rows($this->command('/interface/bridge/port/print', [
            '?bridge=' . $bridge,
            '?interface=' . $interface,
        ]));
        if (!empty($existing)) return;

        $this->command('/interface/bridge/port/add', [
            '=bridge=' . $bridge,
            '=interface=' . $interface,
        ]);
    }

    public function addIpAddress(string $address, string $interface): void
    {
        $existing = $this->command('/ip/address/print', ['?interface=' . $interface]);
        foreach ($existing as $addr) {
            if (isset($addr['.id'])) {
                $this->command('/ip/address/remove', ['=.id=' . $addr['.id']]);
            }
        }

        $this->command('/ip/address/add', [
            '=address=' . $address,
            '=interface=' . $interface,
        ]);
    }

    /**
     * Sets up an IP pool, DHCP server, and hotspot server bound to the
     * given bridge interface, using the given network/gateway.
     */
    public function setupHotspot(string $bridge, string $networkCidr, string $gatewayIp): void
    {
        [$network, $prefix] = explode('/', $networkCidr);
        $rangeStart = $this->offsetIp($network, 2);
        $rangeEnd = $this->broadcastMinusOne($network, (int) $prefix);

        $poolName = $bridge . '-pool';
        $existingPool = $this->rows($this->command('/ip/pool/print', ['?name=' . $poolName]));
        if (empty($existingPool)) {
            $this->command('/ip/pool/add', [
                '=name=' . $poolName,
                '=ranges=' . $rangeStart . '-' . $rangeEnd,
            ]);
        }

        $existingDhcp = $this->rows($this->command('/ip/dhcp-server/print', ['?interface=' . $bridge]));
        if (empty($existingDhcp)) {
            $this->command('/ip/dhcp-server/add', [
                '=name=' . $bridge . '-dhcp',
                '=interface=' . $bridge,
                '=address-pool=' . $poolName,
                '=lease-time=1h',
                '=disabled=no',
            ]);
        }

        $existingNetwork = $this->rows($this->command('/ip/dhcp-server/network/print', ['?address=' . $networkCidr]));
        if (empty($existingNetwork)) {
            $this->command('/ip/dhcp-server/network/add', [
                '=address=' . $networkCidr,
                '=gateway=' . $gatewayIp,
                '=dns-server=8.8.8.8,1.1.1.1',
            ]);
        }

        $profileName = $bridge . '-profile';
        $existingProfile = $this->rows($this->command('/ip/hotspot/profile/print', ['?name=' . $profileName]));
        if (empty($existingProfile)) {
            $this->command('/ip/hotspot/profile/add', [
                '=name=' . $profileName,
                '=hotspot-address=' . $gatewayIp,
                '=dns-name=hotspot.local',
                '=login-by=http-chap,cookie',
            ]);
        }

        $existingHotspot = $this->rows($this->command('/ip/hotspot/print', ['?interface=' . $bridge]));
        if (empty($existingHotspot)) {
            $this->command('/ip/hotspot/add', [
                '=name=' . $bridge . '-hotspot',
                '=interface=' . $bridge,
                '=address-pool=' . $poolName,
                '=profile=' . $profileName,
                '=disabled=no',
            ]);
        }
    }

    private function offsetIp(string $networkAddress, int $offset): string
    {
        $long = ip2long($networkAddress);
        return long2ip($long + $offset);
    }

    private function broadcastMinusOne(string $networkAddress, int $prefix): string
    {
        $long = ip2long($networkAddress);
        $hostBits = 32 - $prefix;
        $broadcast = $long | ((1 << $hostBits) - 1);
        return long2ip($broadcast - 1);
    }

    public static function connect_to(Router $router): self
    {
        $svc = new self($router);
        $svc->connect();
        return $svc;
    }
}
