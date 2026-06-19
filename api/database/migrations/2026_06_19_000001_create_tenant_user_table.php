<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('tenant_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role')->default('admin'); // admin, staff
            $table->timestamps();
            $table->unique(['tenant_id', 'user_id']);
        });

        // Backfill: every existing user's home tenant becomes a membership so
        // current logins keep access to their business.
        $users = DB::table('users')->whereNotNull('tenant_id')->get(['id', 'tenant_id', 'role']);
        $now = now();
        foreach ($users as $u) {
            DB::table('tenant_user')->insertOrIgnore([
                'tenant_id' => $u->tenant_id,
                'user_id' => $u->id,
                'role' => $u->role ?? 'admin',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_user');
    }
};
