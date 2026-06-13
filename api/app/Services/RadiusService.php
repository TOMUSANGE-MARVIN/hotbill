<?php

namespace App\Services;

use App\Models\Subscriber;
use Illuminate\Support\Facades\DB;

class RadiusService
{
    public function syncSubscriber(Subscriber $subscriber): void
    {
        $username = $subscriber->username;

        // Clear existing entries
        DB::table('radcheck')->where('username', $username)->delete();
        DB::table('radreply')->where('username', $username)->delete();
        DB::table('radusergroup')->where('username', $username)->delete();

        if ($subscriber->status !== 'active') {
            return; // Revoked — no entries = access denied
        }

        // Auth: Cleartext-Password
        DB::table('radcheck')->insert([
            'username' => $username,
            'attribute' => 'Cleartext-Password',
            'op' => ':=',
            'value' => $subscriber->password,
        ]);

        $package = $subscriber->package;

        if ($package) {
            // Reply: rate limit
            if ($package->speed_up || $package->speed_down) {
                DB::table('radreply')->insert([
                    'username' => $username,
                    'attribute' => 'Mikrotik-Rate-Limit',
                    'op' => '=',
                    'value' => $package->mikrotik_rate_limit,
                ]);
            }

            // Reply: session timeout (data cap in octets)
            if ($package->data_limit_mb) {
                $limitBytes = $package->data_limit_mb * 1048576;
                DB::table('radreply')->insert([
                    'username' => $username,
                    'attribute' => 'Mikrotik-Total-Limit',
                    'op' => '=',
                    'value' => $limitBytes,
                ]);
            }

            // Session time limit
            if ($package->duration_minutes || $package->duration_hours || $package->duration_days) {
                $seconds = (($package->duration_days ?? 0) * 86400)
                    + (($package->duration_hours ?? 0) * 3600)
                    + (($package->duration_minutes ?? 0) * 60);

                DB::table('radreply')->insert([
                    'username' => $username,
                    'attribute' => 'Session-Timeout',
                    'op' => '=',
                    'value' => $seconds,
                ]);
            }

            // Assign to group (for profile-based config)
            DB::table('radusergroup')->insert([
                'username' => $username,
                'groupname' => "package_{$package->id}",
                'priority' => 1,
            ]);
        }
    }

    public function deleteSubscriber(string $username): void
    {
        DB::table('radcheck')->where('username', $username)->delete();
        DB::table('radreply')->where('username', $username)->delete();
        DB::table('radusergroup')->where('username', $username)->delete();
    }

    public function syncAllForTenant(int $tenantId): void
    {
        Subscriber::where('tenant_id', $tenantId)
            ->with('package')
            ->each(fn ($s) => $this->syncSubscriber($s));
    }

    public function registerNas(string $ip, string $secret, string $shortname = ''): void
    {
        DB::table('radnas')->updateOrInsert(
            ['nasname' => $ip],
            [
                'shortname' => $shortname ?: $ip,
                'type' => 'other',
                'secret' => $secret,
                'description' => 'MikroTik Router',
            ]
        );
    }

    public function removeNas(string $ip): void
    {
        DB::table('radnas')->where('nasname', $ip)->delete();
    }
}
