<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('description');
            $table->string('category')->nullable(); // bandwidth, salary, equipment, rent
            $table->decimal('amount', 12, 2);
            $table->string('currency', 10)->default('UGX');
            $table->string('receipt_path')->nullable();
            $table->text('notes')->nullable();
            $table->date('expense_date');
            $table->timestamps();
            $table->index(['tenant_id', 'expense_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
