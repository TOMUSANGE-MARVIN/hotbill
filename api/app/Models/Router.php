<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Router extends Model
{
    protected $fillable = [
        'tenant_id', 'name', 'description', 'ip_address', 'api_port',
        'api_username', 'api_password', 'token', 'nas_identifier', 'radius_secret',
        'identity', 'model', 'ros_version', 'serial_number',
        'cpu_load', 'free_memory', 'total_memory', 'uptime', 'active_users',
        'data_rx', 'data_tx', 'status', 'last_seen_at', 'is_active',
    ];

    protected $hidden = ['api_password', 'token', 'radius_secret'];

    protected $casts = [
        'last_seen_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    protected $appends = ['is_online'];

    protected static function booted(): void
    {
        static::creating(function (Router $router) {
            $router->token = $router->token ?? Str::random(48);
            $router->nas_identifier = $router->nas_identifier ?? $router->name;
            $router->radius_secret = $router->radius_secret ?? Str::random(32);

            // Auto-provisioned by the install script — the user never types these in.
            if (empty($router->api_username)) {
                $router->api_username = 'hotbill';
            }
            if (empty($router->api_password)) {
                $router->api_password = Str::random(20);
            }
            if (empty($router->api_port)) {
                $router->api_port = 8728;
            }
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function stats(): HasMany
    {
        return $this->hasMany(RouterStat::class);
    }

    public function subscribers(): HasMany
    {
        return $this->hasMany(Subscriber::class);
    }

    public function bridges(): HasMany
    {
        return $this->hasMany(RouterBridge::class);
    }

    public function isOnline(): bool
    {
        return $this->last_seen_at && $this->last_seen_at->gt(now()->subMinutes(3));
    }

    public function getIsOnlineAttribute(): bool
    {
        return $this->isOnline();
    }

    /**
     * The single command the user pastes into the router terminal. It fetches and
     * runs provision_script, which contains the actual setup logic — nothing else
     * needs to be typed in (no IP, no credentials).
     */
    public function getScriptAttribute(): string
    {
        $url = config('app.url');
        $token = $this->token;
        $mode = str_starts_with($url, 'https://') ? 'https' : 'http';

        return <<<SCRIPT
/tool fetch url="{$url}/api/v1/routers/scripts/install" http-header-field="Authorization: Bearer {$token}" dst-path="hotbill.rsc" mode={$mode}; :delay 2s; /import file-name="hotbill.rsc"; :delay 1s; /file remove "hotbill.rsc"
SCRIPT;
    }

    /**
     * Full provisioning script downloaded and run by the bootstrap command above.
     * Sets identity, creates the HotBill API user with auto-generated credentials,
     * registers with RADIUS, and schedules the heartbeat (which reports the
     * router's own IP back so HotBill can reach it for automatic deployment).
     */
    public function getProvisionScriptAttribute(): string
    {
        $url = config('app.url');
        $radiusHost = gethostbyname(parse_url($url, PHP_URL_HOST));
        $token = $this->token;
        $apiUser = $this->api_username;
        $apiPass = $this->api_password;
        $apiPort = $this->api_port;
        $name = $this->name;

        return <<<SCRIPT
:log info "HotBill: provisioning started"
/system identity set name="{$name}"

/user remove [find name="{$apiUser}"]
/user add name="{$apiUser}" password="{$apiPass}" group=full comment="hotbill-managed"
/ip service set api port={$apiPort} disabled=no

/radius remove [find comment="hotbill"]
/radius add address={$radiusHost} secret={$this->radius_secret} service=hotspot,ppp authentication-port=1812 accounting-port=1813 comment="hotbill"
/ip hotspot profile set [find] use-radius=yes radius-accounting=yes

/ip hotspot walled-garden remove [find comment="hotbill-portal"]
/ip hotspot walled-garden add dst-host=*hotbill* action=allow comment="hotbill-portal"

/system scheduler remove [find name=hotbill-heartbeat]
/system scheduler add name=hotbill-heartbeat interval=60s start-time=startup on-event=":local cpu [/system resource get cpu-load]; :local mem [/system resource get free-memory]; :local tmem [/system resource get total-memory]; :local upt [/system resource get uptime]; :local usr [/ip hotspot active print count-only]; :local ip \"\"; :local addrs [/ip address find disabled=no]; :if ([:len \$addrs] > 0) do={ :local cidr [/ip address get ([:pick \$addrs 0]) address]; :set ip [:pick \$cidr 0 [:find \$cidr \"/\"]] }; /tool fetch url=\"{$url}/api/v1/routers/heartbeat\" http-method=post http-header-field=\"Authorization: Bearer {$token}\" http-data=(\"cpu=\" . \$cpu . \"&memory=\" . \$mem . \"&total_memory=\" . \$tmem . \"&uptime=\" . \$upt . \"&active_users=\" . \$usr . \"&ip=\" . \$ip) keep-result=no"
/system scheduler run hotbill-heartbeat

:log info "HotBill: provisioning complete"
:put "HotBill provisioning complete"
SCRIPT;
    }
}
