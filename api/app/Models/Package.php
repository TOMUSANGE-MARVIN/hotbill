<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Package extends Model
{
    protected $fillable = [
        'tenant_id', 'name', 'description', 'type', 'price', 'currency',
        'speed_up', 'speed_down', 'data_limit_mb', 'duration_days',
        'duration_hours', 'duration_minutes', 'burst_up', 'burst_down',
        'burst_threshold_up', 'burst_threshold_down', 'burst_time',
        'pool_name', 'billing_starts', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'price' => 'decimal:2',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function subscribers(): HasMany
    {
        return $this->hasMany(Subscriber::class);
    }

    public function vouchers(): HasMany
    {
        return $this->hasMany(Voucher::class);
    }

    public function getDurationLabelAttribute(): string
    {
        if ($this->duration_days) return "{$this->duration_days} day(s)";
        if ($this->duration_hours) return "{$this->duration_hours} hour(s)";
        if ($this->duration_minutes) return "{$this->duration_minutes} minute(s)";
        return 'Unlimited';
    }

    public function getSpeedLabelAttribute(): string
    {
        $up = $this->speed_up ? round($this->speed_up / 1024, 1) . 'M' : '∞';
        $down = $this->speed_down ? round($this->speed_down / 1024, 1) . 'M' : '∞';
        return "↑{$up} / ↓{$down}";
    }

    // Returns the MikroTik rate-limit string
    public function getMikrotikRateLimitAttribute(): string
    {
        $up = $this->speed_up ? "{$this->speed_up}k" : '0';
        $down = $this->speed_down ? "{$this->speed_down}k" : '0';
        return "{$up}/{$down}";
    }

    // MikroTik limit-uptime string (e.g. "1d2h30m"); empty = no time limit
    public function getMikrotikLimitUptimeAttribute(): string
    {
        $parts = '';
        if ($this->duration_days) $parts .= "{$this->duration_days}d";
        if ($this->duration_hours) $parts .= "{$this->duration_hours}h";
        if ($this->duration_minutes) $parts .= "{$this->duration_minutes}m";
        return $parts;
    }

    // Total data cap in bytes; null = unlimited
    public function getDataLimitBytesAttribute(): ?int
    {
        return $this->data_limit_mb ? $this->data_limit_mb * 1048576 : null;
    }
}
