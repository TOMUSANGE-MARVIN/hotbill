<?php

namespace App\Console\Commands;

use App\Models\RouterCommand;
use Illuminate\Console\Command;

/**
 * A command is 'sent' once the router has downloaded it; the router then
 * reports done/failed over HTTPS. If that report never arrives (API restarting
 * during a deploy, a network blip, the router rebooting mid-batch) the command
 * would sit 'sent' forever and look stuck. After a grace period it is marked
 * 'unconfirmed': delivered, outcome unknown - not 'failed', because it most
 * likely ran. 'pending' commands are left alone so offline routers still get
 * them when they reconnect.
 */
class ExpireUnconfirmedRouterCommands extends Command
{
    protected $signature = 'router-commands:expire-unconfirmed {--minutes=15}';
    protected $description = "Mark router commands that were delivered but never reported back as 'unconfirmed'";

    public function handle(): int
    {
        $count = RouterCommand::query()
            ->where('status', 'sent')
            ->where('sent_at', '<', now()->subMinutes((int) $this->option('minutes')))
            ->update([
                'status' => 'unconfirmed',
                'result' => 'Router downloaded this command but never reported the outcome.',
            ]);

        $this->info("Marked {$count} command(s) unconfirmed.");

        return self::SUCCESS;
    }
}
