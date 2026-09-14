<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            // Platform-admin-controlled per-tenant override for voucher commission.
            // The global VOUCHER_COMMISSION_PERCENT config default (0%) still
            // applies to any tenant with this left off - these two columns let
            // the platform admin switch specific accounts back on individually,
            // at whatever rate makes sense for that account.
            $table->boolean('voucher_commission_enabled')->default(false)->after('payout_provider');
            $table->decimal('voucher_commission_rate', 5, 2)->default(0)->after('voucher_commission_enabled');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn(['voucher_commission_enabled', 'voucher_commission_rate']);
        });
    }
};
