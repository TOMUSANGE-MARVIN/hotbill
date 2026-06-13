<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subscriber_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('agent_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('voucher_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('package_id')->nullable()->constrained()->nullOnDelete();
            $table->string('reference')->unique();
            $table->enum('type', ['topup', 'voucher', 'subscription', 'manual', 'refund'])->default('topup');
            $table->enum('method', ['mtn_momo', 'airtel_money', 'cash', 'card', 'bank'])->default('cash');
            $table->decimal('amount', 12, 2);
            $table->decimal('commission', 12, 2)->default(0);
            $table->decimal('net_amount', 12, 2);
            $table->string('currency', 10)->default('UGX');
            $table->enum('status', ['pending', 'completed', 'failed', 'refunded'])->default('pending');
            $table->string('external_reference')->nullable(); // mobile money ref
            $table->string('phone')->nullable(); // payer phone
            $table->text('notes')->nullable();
            $table->json('meta')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'paid_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
