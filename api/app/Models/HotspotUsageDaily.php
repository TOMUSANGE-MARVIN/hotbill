<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HotspotUsageDaily extends Model
{
    protected $table = 'hotspot_usage_daily';

    protected $fillable = ['tenant_id', 'date', 'bytes', 'sessions'];

    protected $casts = ['date' => 'date'];
}
