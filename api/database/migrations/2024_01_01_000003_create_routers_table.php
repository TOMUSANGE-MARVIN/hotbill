<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('routers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('description')->nullable();
            $table->string('ip_address')->nullable();
            $table->integer('api_port')->default(8728);
            $table->string('api_username')->default('admin');
            $table->string('api_password')->nullable();
            $table->string('token', 64)->unique(); // used in MikroTik heartbeat script
            $table->string('nas_identifier')->nullable(); // for RADIUS NAS
            $table->string('radius_secret')->nullable();
            $table->string('identity')->nullable(); // router identity from heartbeat
            $table->string('model')->nullable();
            $table->string('ros_version')->nullable();
            $table->string('serial_number')->nullable();
            $table->integer('cpu_load')->nullable();
            $table->bigInteger('free_memory')->nullable();
            $table->bigInteger('total_memory')->nullable();
            $table->string('uptime')->nullable();
            $table->integer('active_users')->default(0);
            $table->bigInteger('data_rx')->default(0); // bytes
            $table->bigInteger('data_tx')->default(0); // bytes
            $table->enum('status', ['online', 'offline', 'unknown'])->default('unknown');
            $table->timestamp('last_seen_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('routers');
    }
};
