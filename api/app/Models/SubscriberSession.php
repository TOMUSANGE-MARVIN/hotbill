<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubscriberSession extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'tenant_id', 'subscriber_id', 'router_id', 'acct_session_id',
        'nas_ip', 'framed_ip', 'calling_station_id',
        'bytes_in', 'bytes_out', 'session_time', 'terminate_cause',
        'started_at', 'stopped_at',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'stopped_at' => 'datetime',
    ];

    public function subscriber(): BelongsTo
    {
        return $this->belongsTo(Subscriber::class);
    }

    public function router(): BelongsTo
    {
        return $this->belongsTo(Router::class);
    }

    public function getDataUsedMbAttribute(): float
    {
        return round(($this->bytes_in + $this->bytes_out) / 1048576, 2);
    }
}
