<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * The paid-flow fix introduced an intermediate 'fulfilling' order status (so the
 * order isn't reported 'paid' until the hotspot user is provisioned). The enum
 * didn't allow it, so the update was truncated and orders stuck on 'pending'
 * ("checking phone" forever). Add the value.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE portal_orders MODIFY status ENUM('pending','paid','fulfilling','failed','expired') NOT NULL DEFAULT 'pending'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE portal_orders MODIFY status ENUM('pending','paid','failed','expired') NOT NULL DEFAULT 'pending'");
        }
    }
};
