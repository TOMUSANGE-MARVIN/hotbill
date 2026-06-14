<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('routers', function (Blueprint $table) {
            $table->string('vpn_ip', 15)->nullable()->unique()->after('ip_address');
            $table->text('vpn_private_key')->nullable()->after('vpn_ip');
            $table->text('vpn_public_key')->nullable()->after('vpn_private_key');
            $table->unsignedSmallInteger('vpn_listen_port')->nullable()->after('vpn_public_key');
            $table->timestamp('vpn_configured_at')->nullable()->after('vpn_listen_port');
        });
    }

    public function down(): void
    {
        Schema::table('routers', function (Blueprint $table) {
            $table->dropColumn([
                'vpn_ip', 'vpn_private_key', 'vpn_public_key',
                'vpn_listen_port', 'vpn_configured_at',
            ]);
        });
    }
};
