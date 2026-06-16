<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Per-customer cumulative usage on a router, polled from the hotspot.
        Schema::create('hotspot_usages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('router_id')->constrained()->cascadeOnDelete();
            $table->string('username');
            $table->string('phone')->nullable();
            $table->foreignId('package_id')->nullable()->constrained()->nullOnDelete();
            $table->bigInteger('bytes_in')->default(0);
            $table->bigInteger('bytes_out')->default(0);
            $table->bigInteger('uptime_seconds')->default(0);
            $table->unsignedInteger('sessions')->default(0);
            $table->boolean('active')->default(false);
            $table->timestamp('first_seen_at')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();

            $table->unique(['router_id', 'username']);
            $table->index(['tenant_id', 'last_seen_at']);
        });

        // Daily byte deltas per tenant — accurate "data over time" without unbounded snapshots.
        Schema::create('hotspot_usage_daily', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->bigInteger('bytes')->default(0);
            $table->unsignedInteger('sessions')->default(0);
            $table->timestamps();

            $table->unique(['tenant_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hotspot_usage_daily');
        Schema::dropIfExists('hotspot_usages');
    }
};
