<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RouterStat extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'router_id', 'cpu_load', 'free_memory', 'total_memory',
        'active_users', 'data_rx', 'data_tx', 'uptime', 'recorded_at',
    ];

    protected $casts = [
        'recorded_at' => 'datetime',
    ];

    public function router(): BelongsTo
    {
        return $this->belongsTo(Router::class);
    }
}
