<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('packages', function (Blueprint $table) {
            // When the package validity clock starts counting.
            //   first_use  — when the subscriber first connects (default)
            //   on_purchase — immediately at payment time
            $table->string('billing_starts', 20)->default('first_use')->after('pool_name');
        });
    }

    public function down(): void
    {
        Schema::table('packages', function (Blueprint $table) {
            $table->dropColumn('billing_starts');
        });
    }
};
