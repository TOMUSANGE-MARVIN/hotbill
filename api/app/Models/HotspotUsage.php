<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HotspotUsage extends Model
{
    protected $fillable = [
        'tenant_id', 'router_id', 'username', 'phone', 'package_id',
        'bytes_in', 'bytes_out', 'uptime_seconds', 'sessions', 'active',
        'first_seen_at', 'last_seen_at',
    ];

    protected $casts = [
        'active' => 'boolean',
        'first_seen_at' => 'datetime',
        'last_seen_at' => 'datetime',
    ];

    public function package(): BelongsTo
    {
        return $this->belongsTo(Package::class);
    }

    public function router(): BelongsTo
    {
        return $this->belongsTo(Router::class);
    }
}
