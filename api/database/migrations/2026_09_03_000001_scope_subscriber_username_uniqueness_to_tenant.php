<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * subscribers.username was globally unique across the whole platform instead
 * of per-tenant - so two unrelated ISPs on HotBill could never both have a
 * subscriber with the same phone-derived username, even though they have no
 * relationship to each other. Surfaced when the same test phone number used
 * on one tenant's router collided while fulfilling a paid order on a second,
 * unrelated tenant's router - an inevitable collision on any real multi-
 * tenant install, not something specific to that one order.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscribers', function (Blueprint $table) {
            $table->dropUnique(['username']);
            $table->dropIndex(['tenant_id', 'username']);
            $table->unique(['tenant_id', 'username']);
        });
    }

    public function down(): void
    {
        Schema::table('subscribers', function (Blueprint $table) {
            $table->dropUnique(['tenant_id', 'username']);
            $table->index(['tenant_id', 'username']);
            $table->unique('username');
        });
    }
};
