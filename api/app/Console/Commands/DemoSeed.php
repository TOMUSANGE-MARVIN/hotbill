<?php

namespace App\Console\Commands;

use App\Models\Agent;
use App\Models\HotspotUsage;
use App\Models\HotspotUsageDaily;
use App\Models\Package;
use App\Models\Router;
use App\Models\Subscriber;
use App\Models\Tenant;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Voucher;
use App\Models\VoucherBatch;
use App\Models\WalletTransaction;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Seeds a self-contained, realistic demo business purely for marketing
 * screenshots. Everything is namespaced under one tenant so `demo:purge`
 * can remove it cleanly. Re-running re-creates it from scratch.
 */
class DemoSeed extends Command
{
    protected $signature = 'demo:seed {--email=demo@hotbill.app} {--password=showcase2026}';
    protected $description = 'Create a demo business with realistic data for screenshots';

    public const MARKER = 'hotbill-demo';

    public function handle(): int
    {
        $email = $this->option('email');
        $password = $this->option('password');

        // Clean slate if re-run.
        $this->call('demo:purge', ['--email' => $email]);

        DB::transaction(function () use ($email, $password) {
            $tenant = Tenant::create([
                'name' => 'BrightNet Hotspot',
                'slug' => 'demo-' . Str::random(6),
                'email' => $email,
                'phone' => '+256700000000',
                'currency' => 'UGX',
                'timezone' => 'Africa/Kampala',
                'plan' => 'pro',
                'wallet_balance' => 552000,
                'payout_phone' => '+256772123456',
                'payout_provider' => 'mtn',
                'settings' => ['marker' => self::MARKER],
            ]);

            $user = User::create([
                'tenant_id' => $tenant->id,
                'name' => 'Demo Operator',
                'email' => $email,
                'password' => Hash::make($password),
                'phone' => '+256700000000',
                'role' => 'admin',
            ]);
            $user->tenants()->attach($tenant->id, ['role' => 'admin']);

            $router = Router::create([
                'tenant_id' => $tenant->id,
                'name' => 'Main Branch Router',
                'ip_address' => '192.168.88.1',
                'status' => 'online',
                'cpu_load' => 18,
                'free_memory' => 180 * 1024 * 1024,
                'total_memory' => 256 * 1024 * 1024,
                'uptime' => '4d2h11m',
                'active_users' => 37,
                'last_seen_at' => now(),
                'model' => 'RB951Ui-2HnD',
            ]);

            // ── Packages ──────────────────────────────────────────────
            $packages = collect([
                ['name' => 'Hourly',  'price' => 500,   'duration_hours' => 1,  'up' => 2000,  'down' => 4000,  'cap' => null],
                ['name' => 'Daily',   'price' => 2000,  'duration_days' => 1,   'up' => 5000,  'down' => 10000, 'cap' => 2048],
                ['name' => 'Weekly',  'price' => 10000, 'duration_days' => 7,   'up' => 8000,  'down' => 20000, 'cap' => 15360],
                ['name' => 'Monthly', 'price' => 35000, 'duration_days' => 30,  'up' => 10000, 'down' => 40000, 'cap' => null],
            ])->map(fn ($p) => Package::create([
                'tenant_id' => $tenant->id,
                'name' => $p['name'],
                'type' => 'hotspot',
                'price' => $p['price'],
                'currency' => 'UGX',
                'speed_up' => $p['up'],
                'speed_down' => $p['down'],
                'data_limit_mb' => $p['cap'],
                'duration_days' => $p['duration_days'] ?? null,
                'duration_hours' => $p['duration_hours'] ?? null,
                'billing_starts' => 'first_use',
                'is_active' => true,
            ]));

            // ── Agents ────────────────────────────────────────────────
            $agents = collect([
                ['name' => 'Sarah Nakato', 'loc' => 'Kampala Central'],
                ['name' => 'James Okello',  'loc' => 'Ntinda'],
                ['name' => 'Grace Auma',    'loc' => 'Nakawa'],
            ])->map(fn ($a) => Agent::create([
                'tenant_id' => $tenant->id,
                'name' => $a['name'],
                'phone' => '+2567' . random_int(10000000, 99999999),
                'location' => $a['loc'],
                'commission_rate' => 10,
                'is_active' => true,
            ]));

            // ── Subscribers ───────────────────────────────────────────
            $firstNames = ['Brian', 'Patricia', 'Daniel', 'Esther', 'Moses', 'Joan', 'Kevin', 'Aisha', 'Peter', 'Lydia', 'Samuel', 'Ruth', 'Henry', 'Mercy', 'Isaac', 'Sandra'];
            $lastNames = ['Mukasa', 'Nabirye', 'Ssali', 'Achan', 'Wanyama', 'Kirabo', 'Tumusiime', 'Namuli'];
            $statuses = ['active', 'active', 'active', 'active', 'expired', 'suspended'];
            $subscribers = collect();
            for ($i = 0; $i < 24; $i++) {
                $pkg = $packages->random();
                $status = $statuses[array_rand($statuses)];
                $activatedAt = Carbon::now()->subDays(random_int(0, 40));
                $subscribers->push(Subscriber::create([
                    'tenant_id' => $tenant->id,
                    'router_id' => $router->id,
                    'package_id' => $pkg->id,
                    'agent_id' => $agents->random()->id,
                    'username' => 'usr' . Str::lower(Str::random(6)),
                    'password' => Str::random(8),
                    'full_name' => $firstNames[array_rand($firstNames)] . ' ' . $lastNames[array_rand($lastNames)],
                    'phone' => '+2567' . random_int(10000000, 99999999),
                    'type' => 'hotspot',
                    'status' => $status,
                    'data_used_mb' => random_int(50, 1800),
                    'data_limit_mb' => $pkg->data_limit_mb,
                    'activated_at' => $activatedAt,
                    'expires_at' => $status === 'expired'
                        ? Carbon::now()->subDays(random_int(1, 5))
                        : Carbon::now()->addDays(random_int(1, 25)),
                ]));
            }

            // ── Transactions over the last 30 days (drives dashboard charts) ──
            $methods = ['mtn_momo', 'mtn_momo', 'airtel_money', 'cash'];
            for ($i = 0; $i < 70; $i++) {
                $pkg = $packages->random();
                $sub = $subscribers->random();
                $agent = $agents->random();
                $amount = (float) $pkg->price;
                $commission = round($amount * 0.10, 2);
                $paidAt = Carbon::now()->subDays(random_int(0, 29))->setTime(random_int(7, 21), random_int(0, 59));
                Transaction::create([
                    'tenant_id' => $tenant->id,
                    'subscriber_id' => $sub->id,
                    'agent_id' => $agent->id,
                    'package_id' => $pkg->id,
                    'reference' => 'DMO-' . Str::upper(Str::random(10)),
                    'type' => 'subscription',
                    'method' => $methods[array_rand($methods)],
                    'amount' => $amount,
                    'commission' => $commission,
                    'net_amount' => $amount - $commission,
                    'currency' => 'UGX',
                    'status' => 'completed',
                    'phone' => $sub->phone,
                    'paid_at' => $paidAt,
                    'created_at' => $paidAt,
                    'updated_at' => $paidAt,
                ]);
            }

            // ── Wallet ledger ending at the tenant's balance (552,000) ──
            $running = 0;
            $entries = [];
            for ($i = 0; $i < 9; $i++) {
                $amt = random_int(40, 95) * 1000;
                $running += $amt;
                $entries[] = ['type' => 'credit', 'source' => 'sale', 'amount' => $amt, 'desc' => 'WiFi sales settlement'];
            }
            // one withdrawal so the page shows a payout too
            $running -= 100000;
            $entries[] = ['type' => 'debit', 'source' => 'withdrawal', 'amount' => 100000, 'desc' => 'Payout to MTN +256772123456'];

            // Re-base so the final balance lands exactly on 552,000.
            $offset = 552000 - $running;
            $bal = 0;
            foreach ($entries as $idx => $e) {
                $signed = $e['type'] === 'credit' ? $e['amount'] : -$e['amount'];
                if ($idx === 0) {
                    $signed += $offset;
                    $e['amount'] += $offset;
                }
                $bal += $signed;
                WalletTransaction::create([
                    'tenant_id' => $tenant->id,
                    'type' => $e['type'],
                    'source' => $e['source'],
                    'amount' => $e['amount'],
                    'balance_after' => $bal,
                    'status' => 'completed',
                    'reference' => 'WX-' . Str::upper(Str::random(8)),
                    'description' => $e['desc'],
                    'created_at' => Carbon::now()->subDays(9 - $idx),
                    'updated_at' => Carbon::now()->subDays(9 - $idx),
                ]);
            }
            $tenant->update(['wallet_balance' => $bal]);

            // ── Voucher batch + vouchers ──────────────────────────────
            $vpkg = $packages->firstWhere('name', 'Daily');
            $batch = VoucherBatch::create([
                'tenant_id' => $tenant->id,
                'package_id' => $vpkg->id,
                'name' => 'reception-batch-1',
                'quantity' => 40,
                'code_length' => 6,
                'unit_price' => $vpkg->price,
                'used_count' => 0,
            ]);
            $used = 0;
            for ($i = 0; $i < 40; $i++) {
                $r = random_int(1, 100);
                $status = $r <= 55 ? 'unused' : ($r <= 80 ? 'active' : 'expired');
                if ($status !== 'unused') {
                    $used++;
                }
                Voucher::create([
                    'tenant_id' => $tenant->id,
                    'batch_id' => $batch->id,
                    'package_id' => $vpkg->id,
                    'router_id' => $router->id,
                    'code' => Str::upper(Str::random(6)),
                    'price' => $vpkg->price,
                    'status' => $status,
                    'used_at' => $status === 'unused' ? null : Carbon::now()->subDays(random_int(0, 10)),
                    'expires_at' => $status === 'expired'
                        ? Carbon::now()->subDays(random_int(1, 4))
                        : ($status === 'active' ? Carbon::now()->addDay() : null),
                    'used_by_username' => $status === 'unused' ? null : 'usr' . Str::lower(Str::random(5)),
                ]);
            }
            $batch->update(['used_count' => $used]);

            // ── Hotspot usage (drives Usage Analytics) ────────────────
            for ($d = 29; $d >= 0; $d--) {
                HotspotUsageDaily::create([
                    'tenant_id' => $tenant->id,
                    'date' => Carbon::now()->subDays($d)->toDateString(),
                    'bytes' => random_int(3, 22) * 1024 * 1024 * 1024,
                    'sessions' => random_int(40, 160),
                ]);
            }
            foreach ($subscribers->take(12) as $sub) {
                HotspotUsage::create([
                    'tenant_id' => $tenant->id,
                    'router_id' => $router->id,
                    'package_id' => $sub->package_id,
                    'username' => $sub->username,
                    'phone' => $sub->phone,
                    'bytes_in' => random_int(1, 8) * 1024 * 1024 * 1024,
                    'bytes_out' => random_int(2, 14) * 1024 * 1024 * 1024,
                    'uptime_seconds' => random_int(3600, 200000),
                    'sessions' => random_int(3, 40),
                    'active' => (bool) random_int(0, 1),
                    'first_seen_at' => Carbon::now()->subDays(random_int(10, 30)),
                    'last_seen_at' => Carbon::now()->subHours(random_int(0, 48)),
                ]);
            }

            $this->info('Demo business created.');
            $this->table(['Field', 'Value'], [
                ['Business', $tenant->name],
                ['Login email', $email],
                ['Password', $this->option('password')],
                ['Wallet balance', 'UGX ' . number_format($tenant->fresh()->wallet_balance)],
                ['Packages', $packages->count()],
                ['Subscribers', $subscribers->count()],
                ['Transactions', 70],
                ['Vouchers', 40],
            ]);
        });

        $this->newLine();
        $this->info('Done. Log in, take your screenshots, then run: php artisan demo:purge');

        return self::SUCCESS;
    }
}
