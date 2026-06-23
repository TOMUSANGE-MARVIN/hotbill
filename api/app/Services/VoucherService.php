<?php

namespace App\Services;

use App\Models\Package;
use App\Models\Subscriber;
use App\Models\Transaction;
use App\Models\Voucher;
use App\Models\VoucherBatch;
use Illuminate\Support\Str;

class VoucherService
{
    public function generateBatch(VoucherBatch $batch): void
    {
        $vouchers = [];

        for ($i = 0; $i < $batch->quantity; $i++) {
            $code = $this->generateCode($batch->prefix, $batch->code_length);
            $vouchers[] = [
                'tenant_id' => $batch->tenant_id,
                'batch_id' => $batch->id,
                'package_id' => $batch->package_id,
                'code' => $code,
                'price' => $batch->unit_price,
                'status' => 'unused',
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        // Insert in chunks to handle large batches
        collect($vouchers)->chunk(500)->each(fn ($chunk) => Voucher::insert($chunk->toArray()));
    }

    private function generateCode(string $prefix = '', int $length = 8): string
    {
        $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I confusion
        do {
            $suffix = '';
            for ($i = 0; $i < $length; $i++) {
                $suffix .= $chars[random_int(0, strlen($chars) - 1)];
            }
            $code = strtoupper($prefix) . $suffix;
        } while (Voucher::where('code', $code)->exists());

        return $code;
    }

    public function redeem(Voucher $voucher, string $username, RadiusService $radius): Subscriber
    {
        if ($voucher->status !== 'unused') {
            throw new \RuntimeException('Voucher already used or invalid');
        }

        $package = $voucher->package;
        $expiresAt = $this->calculateExpiry($package);

        // Create or activate subscriber
        $subscriber = Subscriber::firstOrCreate(
            ['username' => $username, 'tenant_id' => $voucher->tenant_id],
            [
                'password' => Str::random(10),
                'type' => $package->type,
                'status' => 'active',
            ]
        );

        $subscriber->update([
            'package_id' => $package->id,
            'status' => 'active',
            'expires_at' => $expiresAt,
            'activated_at' => now(),
            'data_used_mb' => 0,
            'data_limit_mb' => $package->data_limit_mb,
        ]);

        // Mark voucher used
        $voucher->update([
            'status' => 'active',
            'used_by' => $subscriber->id,
            'used_by_username' => $username,
            'used_at' => now(),
            'expires_at' => $expiresAt,
        ]);

        // Platform commission: a % of the voucher value, taken when the voucher is
        // used. Debited from the operator's wallet (may go negative — settled later).
        $commissionPercent = (float) config('hotbill.platform.voucher_commission_percent');
        $value = (float) $voucher->price;
        $commission = round($value * $commissionPercent / 100, 2);
        $net = round($value - $commission, 2);

        // Record the sale transaction (shows the voucher and the fee deducted).
        $transaction = Transaction::create([
            'tenant_id' => $voucher->tenant_id,
            'subscriber_id' => $subscriber->id,
            'voucher_id' => $voucher->id,
            'package_id' => $package->id,
            'type' => 'voucher',
            'method' => 'cash',
            'amount' => $value,
            'commission' => $commission,
            'net_amount' => $net,
            'status' => 'completed',
            'paid_at' => now(),
            'notes' => "Voucher {$voucher->code} redeemed",
            'meta' => [
                'voucher_code' => $voucher->code,
                'commission_percent' => $commissionPercent,
            ],
        ]);

        // Deduct the commission from the operator wallet and log it on the ledger
        // so it is auditable both on the operator's wallet and in platform revenue.
        if ($commission > 0) {
            $walletTxn = $voucher->tenant->postWallet('debit', $commission, 'voucher_commission', [
                'reference' => $transaction->reference,
                'status' => 'completed',
                'description' => "Platform fee {$commissionPercent}% — voucher {$voucher->code}",
                'meta' => [
                    'voucher_id' => $voucher->id,
                    'voucher_code' => $voucher->code,
                    'voucher_value' => $value,
                    'commission_percent' => $commissionPercent,
                    'transaction_id' => $transaction->id,
                ],
            ]);

            // Record the resulting wallet balance on the sale so the transactions
            // list shows the balance for that specific sale.
            $transaction->update([
                'meta' => array_merge($transaction->meta ?? [], [
                    'balance_after' => (float) $walletTxn->balance_after,
                ]),
            ]);
        }

        // Sync to RADIUS
        $radius->syncSubscriber($subscriber);

        // Update batch count
        VoucherBatch::where('id', $voucher->batch_id)->increment('used_count');

        return $subscriber;
    }

    private function calculateExpiry(Package $package): ?\DateTime
    {
        if (!$package->duration_days && !$package->duration_hours && !$package->duration_minutes) {
            return null;
        }

        return now()
            ->addDays($package->duration_days ?? 0)
            ->addHours($package->duration_hours ?? 0)
            ->addMinutes($package->duration_minutes ?? 0);
    }
}
