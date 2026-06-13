<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VoucherBatch extends Model
{
    protected $fillable = [
        'tenant_id', 'package_id', 'agent_id', 'name',
        'quantity', 'code_length', 'prefix', 'unit_price', 'used_count',
    ];

    protected $casts = [
        'unit_price' => 'decimal:2',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(Package::class);
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    public function vouchers(): HasMany
    {
        return $this->hasMany(Voucher::class, 'batch_id');
    }

    public function getRemainingCountAttribute(): int
    {
        return $this->quantity - $this->used_count;
    }
}
