<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('subscriber_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subscriber_id')->constrained()->cascadeOnDelete();
            $table->foreignId('router_id')->nullable()->constrained()->nullOnDelete();
            $table->string('acct_session_id')->nullable();
            $table->string('nas_ip')->nullable();
            $table->string('framed_ip')->nullable();
            $table->string('calling_station_id')->nullable(); // MAC address
            $table->bigInteger('bytes_in')->default(0);
            $table->bigInteger('bytes_out')->default(0);
            $table->integer('session_time')->default(0); // seconds
            $table->string('terminate_cause')->nullable();
            $table->timestamp('started_at');
            $table->timestamp('stopped_at')->nullable();
            $table->index(['tenant_id', 'subscriber_id']);
            $table->index(['acct_session_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriber_sessions');
    }
};
