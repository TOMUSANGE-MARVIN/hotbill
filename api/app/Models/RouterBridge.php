<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RouterBridge extends Model
{
    protected $fillable = [
        'router_id', 'name', 'gateway_ip', 'subnet_prefix', 'ports',
        'hotspot_enabled', 'pppoe_enabled', 'wlan_enabled',
        'status', 'deploy_error', 'deployed_at',
    ];

    protected $casts = [
        'ports' => 'array',
        'hotspot_enabled' => 'boolean',
        'pppoe_enabled' => 'boolean',
        'wlan_enabled' => 'boolean',
        'deployed_at' => 'datetime',
    ];

    public function router(): BelongsTo
    {
        return $this->belongsTo(Router::class);
    }
}
