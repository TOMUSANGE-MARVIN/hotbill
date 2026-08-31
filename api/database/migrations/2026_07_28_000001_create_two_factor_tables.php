<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // One-time email codes for account verification (registration) and
        // periodic login 2FA. The plaintext code is never stored - only a hash.
        Schema::create('email_otps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('purpose', 20); // register | login
            $table->string('code_hash');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('expires_at');
            $table->timestamp('consumed_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'purpose']);
        });

        // Devices a user has verified via login 2FA. While a device's token is
        // valid, login skips the emailed code - this is what makes 2FA
        // "periodic" (re-prompted per new device and after the window lapses).
        Schema::create('user_trusted_devices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('token_hash', 64)->unique();
            $table->string('label')->nullable();     // user agent summary
            $table->string('ip', 45)->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_trusted_devices');
        Schema::dropIfExists('email_otps');
    }
};
