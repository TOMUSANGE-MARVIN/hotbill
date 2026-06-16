<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Tenant extends Model
{
    protected $fillable = [
        'name', 'slug', 'email', 'phone', 'currency', 'timezone',
        'plan', 'is_active', 'settings', 'trial_ends_at',
        'wallet_balance', 'payout_phone', 'payout_provider',
    ];

    protected $casts = [
        'settings' => 'array',
        'is_active' => 'boolean',
        'trial_ends_at' => 'datetime',
        'wallet_balance' => 'decimal:2',
    ];

    /**
     * Atomically move money in/out of the wallet and record a ledger row.
     * Returns the created WalletTransaction.
     */
    public function postWallet(string $type, float $amount, string $source, array $attrs = []): WalletTransaction
    {
        return DB::transaction(function () use ($type, $amount, $source, $attrs) {
            $tenant = self::whereKey($this->id)->lockForUpdate()->first();
            $delta = $type === 'credit' ? $amount : -$amount;
            $newBalance = (float) $tenant->wallet_balance + $delta;

            $tenant->update(['wallet_balance' => $newBalance]);
            $this->wallet_balance = $newBalance;

            return $this->walletTransactions()->create(array_merge([
                'type' => $type,
                'source' => $source,
                'amount' => $amount,
                'balance_after' => $newBalance,
            ], $attrs));
        });
    }

    public function walletTransactions(): HasMany
    {
        return $this->hasMany(WalletTransaction::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function routers(): HasMany
    {
        return $this->hasMany(Router::class);
    }

    public function packages(): HasMany
    {
        return $this->hasMany(Package::class);
    }

    public function subscribers(): HasMany
    {
        return $this->hasMany(Subscriber::class);
    }

    public function agents(): HasMany
    {
        return $this->hasMany(Agent::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function vouchers(): HasMany
    {
        return $this->hasMany(Voucher::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function campaigns(): HasMany
    {
        return $this->hasMany(Campaign::class);
    }
}
