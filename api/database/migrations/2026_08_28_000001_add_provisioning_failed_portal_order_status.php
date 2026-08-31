<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Paid orders were being marked 'paid' (and reporting hotspot credentials to the
 * client) even when the router never confirmed the hotspot user was created -
 * customers were charged and told they were connected while never actually
 * getting a working session. 'provisioning_failed' lets fulfill() record the
 * payment truthfully while withholding 'paid' (and the credentials) until the
 * router really confirms, and RetryOrderProvisioning keeps retrying from there.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE portal_orders MODIFY status ENUM('pending','paid','fulfilling','provisioning_failed','failed','expired') NOT NULL DEFAULT 'pending'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE portal_orders MODIFY status ENUM('pending','paid','fulfilling','failed','expired') NOT NULL DEFAULT 'pending'");
        }
    }
};
