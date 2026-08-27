<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Links a paid order to the RouterCommand provisioning its hotspot user, so the
 * status endpoint can check completion without blocking the request (see
 * PortalController — the old synchronous ~35s wait inside fulfill() could
 * outlive PHP's max_execution_time / a mobile browser's fetch timeout, killing
 * the request after payment had already been taken).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('portal_orders', function (Blueprint $table) {
            $table->foreignId('provisioning_command_id')->nullable()->after('link_login')
                ->constrained('router_commands')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('portal_orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('provisioning_command_id');
        });
    }
};
