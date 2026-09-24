<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('portal_orders', function (Blueprint $table) {
            // The telco's own transaction reference (what MTN/Airtel actually put
            // in the SMS receipt they sent the customer) - distinct from
            // pesapal_tracking_id, which is MarzPay's internal collection UUID and
            // never appears anywhere the customer can see it. "Find my transaction
            // ID" is useless to a real customer if it can only match a reference
            // they've never seen.
            $table->string('provider_reference')->nullable()->after('pesapal_tracking_id');
        });
    }

    public function down(): void
    {
        Schema::table('portal_orders', function (Blueprint $table) {
            $table->dropColumn('provider_reference');
        });
    }
};
