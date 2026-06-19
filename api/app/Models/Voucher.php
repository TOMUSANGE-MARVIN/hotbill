<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Voucher extends Model
{
    protected $fillable = [
        'tenant_id', 'batch_id', 'package_id', 'router_id', 'code', 'price',
        'status', 'used_by', 'used_by_username', 'used_at', 'expires_at',
    ];

    protected $casts = [
        'used_at' => 'datetime',
        'expires_at' => 'datetime',
        'price' => 'decimal:2',
    ];

    /**
     * Flip any redeemed ("active") vouchers whose validity window has passed to
     * "expired". Cheap, idempotent bulk update — call it before reading vouchers
     * so listings/exports/filters reflect real expiry without a cron.
     */
    public static function expireStale(int $tenantId): void
    {
        static::where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->update(['status' => 'expired']);
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(VoucherBatch::class, 'batch_id');
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(Package::class);
    }

    public function router(): BelongsTo
    {
        return $this->belongsTo(Router::class);
    }

    public function usedBySubscriber(): BelongsTo
    {
        return $this->belongsTo(Subscriber::class, 'used_by');
    }
}
