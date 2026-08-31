<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * The wallet_transactions.source enum was missing 'voucher_commission', which
 * both the portal and operator voucher-redeem paths pass to postWallet() - so
 * redeeming a voucher whose package carries a commission threw "Data truncated
 * for column 'source'" (a 500). Add the value. (SQLite has no enum enforcement.)
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE wallet_transactions MODIFY source ENUM('sale','withdrawal','adjustment','voucher_commission') NOT NULL DEFAULT 'sale'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE wallet_transactions MODIFY source ENUM('sale','withdrawal','adjustment') NOT NULL DEFAULT 'sale'");
        }
    }
};
