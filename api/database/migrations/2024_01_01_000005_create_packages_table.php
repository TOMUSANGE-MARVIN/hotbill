<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('packages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->enum('type', ['hotspot', 'pppoe'])->default('hotspot');
            $table->decimal('price', 12, 2);
            $table->string('currency', 10)->default('UGX');
            $table->integer('speed_up')->nullable();   // Kbps
            $table->integer('speed_down')->nullable(); // Kbps
            $table->bigInteger('data_limit_mb')->nullable(); // null = unlimited
            $table->integer('duration_days')->nullable(); // null = no expiry
            $table->integer('duration_hours')->nullable();
            $table->integer('duration_minutes')->nullable();
            $table->integer('burst_up')->nullable();    // burst Kbps
            $table->integer('burst_down')->nullable();
            $table->integer('burst_threshold_up')->nullable();
            $table->integer('burst_threshold_down')->nullable();
            $table->integer('burst_time')->nullable();  // seconds
            $table->string('pool_name')->nullable();    // MikroTik IP pool
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('packages');
    }
};
