<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Subscriber extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'tenant_id', 'router_id', 'package_id', 'agent_id',
        'username', 'password', 'full_name', 'phone', 'email', 'address',
        'type', 'status', 'balance', 'data_used_mb', 'data_limit_mb',
        'expires_at', 'activated_at', 'mac_address', 'ip_address',
    ];

    protected $hidden = ['password'];

    protected $casts = [
        'expires_at' => 'datetime',
        'activated_at' => 'datetime',
        'balance' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function router(): BelongsTo
    {
        return $this->belongsTo(Router::class);
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(Package::class);
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(SubscriberSession::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function activeSession(): ?SubscriberSession
    {
        return $this->sessions()->whereNull('stopped_at')->latest('started_at')->first();
    }

    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    public function isDataExhausted(): bool
    {
        return $this->data_limit_mb && $this->data_used_mb >= $this->data_limit_mb;
    }
}
