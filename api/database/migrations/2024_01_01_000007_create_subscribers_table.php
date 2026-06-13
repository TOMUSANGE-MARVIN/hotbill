<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('subscribers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('router_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('package_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('agent_id')->nullable()->constrained()->nullOnDelete();
            $table->string('username')->unique();
            $table->string('password'); // plaintext for RADIUS (or stored for display)
            $table->string('full_name')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('address')->nullable();
            $table->enum('type', ['hotspot', 'pppoe'])->default('hotspot');
            $table->enum('status', ['active', 'suspended', 'expired', 'inactive'])->default('inactive');
            $table->decimal('balance', 12, 2)->default(0);
            $table->bigInteger('data_used_mb')->default(0);
            $table->bigInteger('data_limit_mb')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('activated_at')->nullable();
            $table->string('mac_address')->nullable();
            $table->string('ip_address')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'username']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscribers');
    }
};
