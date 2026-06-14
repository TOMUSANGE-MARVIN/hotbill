<?php

namespace App\Services;

use App\Models\Router;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use RuntimeException;

class WireguardService
{
    /**
     * Generate a fresh WireGuard keypair using the `wg` CLI.
     * Returns ['private' => ..., 'public' => ...].
     */
    public function generateKeypair(): array
    {
        $priv = Process::run('wg genkey');
        if (!$priv->successful()) {
            throw new RuntimeException('wg genkey failed: ' . $priv->errorOutput());
        }
        $privateKey = trim($priv->output());

        $pub = Process::run(['sh', '-c', 'echo ' . escapeshellarg($privateKey) . ' | wg pubkey']);
        if (!$pub->successful()) {
            throw new RuntimeException('wg pubkey failed: ' . $pub->errorOutput());
        }

        return ['private' => $privateKey, 'public' => trim($pub->output())];
    }

    /**
     * Allocate the next free /32 in the WireGuard subnet (default 10.66.0.0/24).
     * .1 is reserved for the server itself.
     */
    public function allocateIp(): string
    {
        $subnet = config('hotbill.wireguard.subnet');
        [$network, $prefix] = explode('/', $subnet);
        $networkLong = ip2long($network);
        $hostBits = 32 - (int) $prefix;
        $maxHosts = (1 << $hostBits) - 2; // exclude network + broadcast addresses

        $taken = Router::whereNotNull('vpn_ip')->pluck('vpn_ip')->all();
        $taken[] = config('hotbill.wireguard.server_vpn_ip'); // .1 reserved

        for ($offset = 2; $offset <= $maxHosts; $offset++) {
            $candidate = long2ip($networkLong + $offset);
            if (!in_array($candidate, $taken, true)) {
                return $candidate;
            }
        }

        throw new RuntimeException("WireGuard subnet exhausted ({$subnet})");
    }

    /**
     * Read the server's public key from the shared wg_data volume
     * (written by the wireguard container's entrypoint on first boot).
     */
    public function getServerPublicKey(): string
    {
        $path = config('hotbill.wireguard.server_pubkey_path');

        if (!File::exists($path)) {
            throw new RuntimeException("WireGuard server public key not found at {$path}");
        }

        return trim(File::get($path));
    }

    /**
     * Write/overwrite this router's peer stanza so the wireguard
     * container's watcher picks it up and hot-applies it via `wg syncconf`.
     */
    public function writePeerConfig(Router $router): void
    {
        if (!$router->vpn_public_key || !$router->vpn_ip) {
            throw new RuntimeException("Router {$router->id} has no VPN keys/IP to write a peer for.");
        }

        $dir = config('hotbill.wireguard.peers_path');
        File::ensureDirectoryExists($dir);

        $contents = "[Peer]\n"
            . "PublicKey = {$router->vpn_public_key}\n"
            . "AllowedIPs = {$router->vpn_ip}/32\n";

        File::put($this->peerFilePath($router), $contents);
    }

    /**
     * Remove this router's peer file (e.g. on router deletion).
     */
    public function removePeerConfig(Router $router): void
    {
        $path = $this->peerFilePath($router);
        if (File::exists($path)) {
            File::delete($path);
        }
    }

    private function peerFilePath(Router $router): string
    {
        return rtrim(config('hotbill.wireguard.peers_path'), '/') . "/router-{$router->id}.conf";
    }
}
