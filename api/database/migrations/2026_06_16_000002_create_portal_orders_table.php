<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('portal_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('router_id')->constrained()->cascadeOnDelete();
            $table->foreignId('package_id')->constrained()->cascadeOnDelete();

            $table->string('phone');
            $table->string('provider')->nullable(); // mtn | airtel (customer's mobile money)
            $table->string('email')->nullable();
            $table->decimal('amount', 12, 2);
            $table->string('currency', 10)->default('UGX');

            $table->enum('status', ['pending', 'paid', 'failed', 'expired'])->default('pending');

            // Fee breakdown captured at fulfillment (operator_net is credited to the wallet).
            $table->decimal('gateway_fee', 12, 2)->nullable();
            $table->decimal('platform_fee', 12, 2)->nullable();
            $table->decimal('operator_net', 12, 2)->nullable();

            $table->string('merchant_reference')->unique();
            $table->string('pesapal_tracking_id')->nullable()->index();
            $table->string('payment_method')->nullable();

            // hotspot credential issued on payment + the MikroTik link to auto-login through
            $table->string('hotspot_username')->nullable();
            $table->string('hotspot_password')->nullable();
            $table->string('client_mac')->nullable();
            $table->string('client_ip')->nullable();
            $table->text('link_login')->nullable();

            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('portal_orders');
    }
};
