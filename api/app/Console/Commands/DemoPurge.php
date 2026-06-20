<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Removes the demo business and everything under it. Tenant-scoped tables use
 * ON DELETE CASCADE, so deleting the tenant clears packages, subscribers,
 * transactions, vouchers, wallet ledger, hotspot usage, routers and agents.
 * The demo user is deleted explicitly (users.tenant_id is nullOnDelete).
 */
class DemoPurge extends Command
{
    protected $signature = 'demo:purge {--email=demo@hotbill.app}';
    protected $description = 'Delete the demo business and all its data';

    public function handle(): int
    {
        $email = $this->option('email');

        DB::transaction(function () use ($email) {
            $tenant = Tenant::where('email', $email)->first();
            $user = User::where('email', $email)->first();

            if ($user) {
                $user->tenants()->detach();
                $user->forceDelete();
            }

            if ($tenant) {
                $tenant->delete(); // cascades all tenant-scoped data
                $this->info("Deleted demo business #{$tenant->id} ({$tenant->name}).");
            } else {
                $this->line('No demo business found — nothing to delete.');
            }
        });

        return self::SUCCESS;
    }
}
