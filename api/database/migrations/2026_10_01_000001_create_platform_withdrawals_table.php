<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The platform's own earnings leaving the MarzPay account - kept apart
        // from wallet_transactions, which is strictly operator money.
        Schema::create('platform_withdrawals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('amount', 14, 2);      // sent to the phone
            $table->decimal('fee', 14, 2)->default(0); // MarzPay disbursement fee
            $table->string('phone', 20);
            $table->string('reference')->unique();
            $table->string('marzpay_uuid')->nullable()->index();
            $table->string('status', 12)->default('processing'); // processing|completed|failed
            $table->string('note')->nullable();
            $table->text('error')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_withdrawals');
    }
};
