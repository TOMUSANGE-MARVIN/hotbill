<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * A voucher was marked 'active' (and counted as a sale) the instant the
 * router confirmed the hotspot user was created - but that only means the
 * account exists, not that the customer's device ever actually connected
 * with it (the client-side auto-login can silently fail). 'connecting' is
 * the in-between state: claimed and provisioned, but not yet confirmed
 * online. Only a confirmed active hotspot session flips it to 'active'.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE vouchers MODIFY status ENUM('unused','connecting','active','expired','revoked') NOT NULL DEFAULT 'unused'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE vouchers MODIFY status ENUM('unused','active','expired','revoked') NOT NULL DEFAULT 'unused'");
        }
    }
};
