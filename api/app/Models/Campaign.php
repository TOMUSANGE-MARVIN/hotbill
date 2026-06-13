<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Campaign extends Model
{
    protected $fillable = [
        'tenant_id', 'name', 'channel', 'message', 'subject',
        'target_filter', 'recipient_count', 'sent_count', 'failed_count',
        'status', 'scheduled_at', 'sent_at',
    ];

    protected $casts = [
        'target_filter' => 'array',
        'scheduled_at' => 'datetime',
        'sent_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
