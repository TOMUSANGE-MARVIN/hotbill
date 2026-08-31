<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Poll-based remote management (the XenFi model): instead of HotBill reaching
 * INTO a router over a VPN (which fails behind NAT/CGNAT), the router polls this
 * queue over outbound HTTPS and applies the scripts locally. Works on any
 * RouterOS version behind any firewall, since it's 100% router-initiated.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('router_commands', function (Blueprint $table) {
            $table->id();
            $table->foreignId('router_id')->constrained()->cascadeOnDelete();
            // What this command is (bridge, reboot, password, script) - for the UI.
            $table->string('kind', 30)->default('script');
            // The RouterOS script the router runs locally.
            $table->text('script');
            // pending -> sent (delivered on a poll) -> done | failed (router reported back)
            $table->string('status', 12)->default('pending');
            // Human-readable label shown in the dashboard.
            $table->string('label')->nullable();
            // Anything the router reports back (error text, output).
            $table->text('result')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->index(['router_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('router_commands');
    }
};
