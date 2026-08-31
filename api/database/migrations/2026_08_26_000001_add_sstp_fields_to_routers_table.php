<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * SSTP is the RouterOS-v6 fallback for the WireGuard tunnel (v6 has no
 * WireGuard). A router is provisioned for BOTH tunnels at install time because
 * the server doesn't yet know the router's RouterOS version; the router runs
 * whichever its OS supports, and HotBill records which via `vpn_type` once the
 * first heartbeat reports the version. See Router::getProvisionScriptAttribute.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('routers', function (Blueprint $table) {
            // Which tunnel HotBill actually reaches this router over.
            // null = unknown yet (pre-heartbeat); resolved to wireguard|sstp.
            $table->string('vpn_type', 12)->nullable()->after('vpn_configured_at');
            // SSTP (PPP) tunnel IP assigned to this router - the reachable host
            // MikrotikService connects to when vpn_type = sstp.
            $table->string('sstp_ip', 15)->nullable()->unique()->after('vpn_type');
            // PPP password for the router's SSTP client (username = router token).
            $table->string('sstp_secret', 64)->nullable()->after('sstp_ip');
        });
    }

    public function down(): void
    {
        Schema::table('routers', function (Blueprint $table) {
            $table->dropColumn(['vpn_type', 'sstp_ip', 'sstp_secret']);
        });
    }
};
