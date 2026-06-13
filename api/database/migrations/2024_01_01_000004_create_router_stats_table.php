<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('router_stats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('router_id')->constrained()->cascadeOnDelete();
            $table->integer('cpu_load')->nullable();
            $table->bigInteger('free_memory')->nullable();
            $table->bigInteger('total_memory')->nullable();
            $table->integer('active_users')->default(0);
            $table->bigInteger('data_rx')->default(0);
            $table->bigInteger('data_tx')->default(0);
            $table->string('uptime')->nullable();
            $table->timestamp('recorded_at');
            $table->index(['router_id', 'recorded_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('router_stats');
    }
};
