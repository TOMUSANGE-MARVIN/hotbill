<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Transaction extends Model
{
    protected $fillable = [
        'tenant_id', 'subscriber_id', 'agent_id', 'voucher_id', 'package_id',
        'reference', 'type', 'method', 'amount', 'commission', 'net_amount',
        'currency', 'status', 'external_reference', 'phone', 'notes', 'meta', 'paid_at',
    ];

    protected $casts = [
        'paid_at' => 'datetime',
        'amount' => 'decimal:2',
        'commission' => 'decimal:2',
        'net_amount' => 'decimal:2',
        'meta' => 'array',
    ];

    protected static function booted(): void
    {
        static::creating(function (Transaction $t) {
            $t->reference = $t->reference ?? strtoupper(Str::random(12));
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function subscriber(): BelongsTo
    {
        return $this->belongsTo(Subscriber::class);
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    public function voucher(): BelongsTo
    {
        return $this->belongsTo(Voucher::class);
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(Package::class);
    }
}
