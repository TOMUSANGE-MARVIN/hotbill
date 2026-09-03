<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Same bug as subscribers.username (2026_09_03_000001): agents.phone was
 * globally unique across the whole platform instead of per-tenant, so the
 * same phone number could never be registered as an agent under two
 * different, unrelated ISPs on HotBill. Agents earn commission on voucher
 * sales, so this is part of the same voucher/sales isolation gap.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->dropUnique(['phone']);
            $table->unique(['tenant_id', 'phone']);
        });
    }

    public function down(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->dropUnique(['tenant_id', 'phone']);
            $table->unique('phone');
        });
    }
};
