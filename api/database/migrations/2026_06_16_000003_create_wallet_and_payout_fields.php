<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->decimal('wallet_balance', 14, 2)->default(0)->after('plan');
            $table->string('payout_phone')->nullable()->after('wallet_balance');
            $table->string('payout_provider')->nullable()->after('payout_phone'); // mtn | airtel
        });

        Schema::create('wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['credit', 'debit']);
            $table->enum('source', ['sale', 'withdrawal', 'adjustment'])->default('sale');
            $table->decimal('amount', 14, 2);
            $table->decimal('balance_after', 14, 2);
            $table->enum('status', ['completed', 'pending', 'processing', 'failed'])->default('completed');
            $table->string('reference')->nullable();
            $table->string('description')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_transactions');
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn(['wallet_balance', 'payout_phone', 'payout_provider']);
        });
    }
};
