<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('vouchers', function (Blueprint $table) {
            // Supports the global vouchers:expire sweep: WHERE status=active AND expires_at < now.
            $table->index(['status', 'expires_at'], 'vouchers_status_expires_at_index');
        });
    }

    public function down(): void
    {
        Schema::table('vouchers', function (Blueprint $table) {
            $table->dropIndex('vouchers_status_expires_at_index');
        });
    }
};
