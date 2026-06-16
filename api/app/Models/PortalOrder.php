<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PortalOrder extends Model
{
    protected $fillable = [
        'tenant_id', 'router_id', 'package_id',
        'phone', 'provider', 'email', 'amount', 'currency',
        'status', 'gateway_fee', 'platform_fee', 'operator_net',
        'merchant_reference', 'pesapal_tracking_id', 'payment_method',
        'hotspot_username', 'hotspot_password', 'client_mac', 'client_ip', 'link_login',
        'paid_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'gateway_fee' => 'decimal:2',
        'platform_fee' => 'decimal:2',
        'operator_net' => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    public function router(): BelongsTo
    {
        return $this->belongsTo(Router::class);
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(Package::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
