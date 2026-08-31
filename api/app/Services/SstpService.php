<?php

namespace App\Services;

use App\Models\Router;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * SSTP is the RouterOS-v6 fallback tunnel (v6 has no WireGuard). The accel-ppp
 * container terminates SSTP and authenticates routers from a chap-secrets file
 * that this service renders from the database - the same "render the whole file
 * from the source of truth" approach the WireGuard container uses for peers,
 * which sidesteps partial-line races when a router is (de)provisioned.
 */
class SstpService
{
    /** Generate a router's PPP password (username is the router token). */
    public function generateSecret(): string
    {
        return Str::random(32);
    }

    /**
     * Allocate the next free /32 in the SSTP subnet (default 10.67.0.0/24).
     * .1 is the accel-ppp gateway and is reserved.
     */
    public function allocateIp(): string
    {
        $subnet = config('hotbill.sstp.subnet');
        [$network, $prefix] = explode('/', $subnet);
        $networkLong = ip2long($network);
        $hostBits = 32 - (int) $prefix;
        $maxHosts = (1 << $hostBits) - 2; // exclude network + broadcast

        $taken = Router::whereNotNull('sstp_ip')->pluck('sstp_ip')->all();
        $taken[] = config('hotbill.sstp.server_vpn_ip'); // .1 reserved

        for ($offset = 2; $offset <= $maxHosts; $offset++) {
            $candidate = long2ip($networkLong + $offset);
            if (!in_array($candidate, $taken, true)) {
                return $candidate;
            }
        }

        throw new RuntimeException("SSTP subnet exhausted ({$subnet})");
    }

    /**
     * Rebuild the chap-secrets file from every router that has SSTP credentials.
     * accel-ppp watches this file and reloads on change. Written atomically
     * (temp + rename) so a concurrent read never sees a half-written file.
     *
     * Format (accel-ppp chap-secrets): `<username> <server> <password> <ip>`
     * where server `*` matches any and the 4th field pins the client's IP.
     */
    public function syncSecrets(): void
    {
        $path = config('hotbill.sstp.secrets_path');
        $dir = dirname($path);

        try {
            if (!File::isDirectory($dir)) {
                File::makeDirectory($dir, 0755, true);
            }

            $lines = ['# Managed by HotBill - do not edit. username server password ip'];
            Router::whereNotNull('sstp_secret')
                ->whereNotNull('sstp_ip')
                ->get(['token', 'sstp_secret', 'sstp_ip'])
                ->each(function (Router $r) use (&$lines) {
                    $lines[] = "{$r->token} * {$r->sstp_secret} {$r->sstp_ip}";
                });

            $tmp = $path . '.tmp';
            File::put($tmp, implode("\n", $lines) . "\n");
            File::move($tmp, $path); // atomic replace on the same filesystem
        } catch (\Throwable $e) {
            // Never let a VPN-file write failure break router provisioning - the
            // router still comes up; the tunnel just won't authenticate until
            // the file is synced. Surface it in logs for the operator.
            Log::warning('HotBill: failed to sync SSTP chap-secrets', [
                'path' => $path,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
