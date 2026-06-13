<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('router_bridges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('router_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('gateway_ip');
            $table->unsignedTinyInteger('subnet_prefix');
            $table->json('ports'); // interface names connected to this bridge
            $table->boolean('hotspot_enabled')->default(false);
            $table->boolean('pppoe_enabled')->default(false);
            $table->boolean('wlan_enabled')->default(false);
            $table->enum('status', ['pending', 'deployed', 'failed'])->default('pending');
            $table->text('deploy_error')->nullable();
            $table->timestamp('deployed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('router_bridges');
    }
};
