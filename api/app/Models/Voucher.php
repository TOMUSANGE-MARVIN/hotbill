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
     * Characters customers actually confuse when reading printed slips (from the
     * redeem rejection log: S/5, B/8, H/M, Y/U ...), each mapped to one
     * representative. Two codes with the same canonical form look alike on paper.
     */
    private const LOOKALIKES = [
        'S' => '5',
        'B' => '8',
        'Z' => '2',
        '6' => 'G',
        'O' => 'D', 'Q' => 'D', '0' => 'D',
        'I' => 'L', '1' => 'L',
        'U' => 'Y', 'V' => 'Y',
        'H' => 'M', 'N' => 'M',
    ];

    /**
     * Alphabet for new codes: at most one character from each look-alike group
     * (plus J dropped - it was read as 3 and 8), so a misread can only ever map
     * back to the code that was printed.
     */
    public const CODE_ALPHABET = 'ACEFKPRTWX3479582GDLYM';

    public static function canonical(string $code): string
    {
        return strtr(strtoupper($code), self::LOOKALIKES);
    }

    /**
     * Flip any redeemed ("active") vouchers whose validity window has passed to
     * "expired". Cheap, idempotent bulk update - call it before reading vouchers
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
