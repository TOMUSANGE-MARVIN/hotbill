<?php

namespace App\Console\Commands;

use App\Models\RouterCommand;
use App\Models\Subscriber;
use Illuminate\Console\Command;

/**
 * Nothing else in the system ever tells the router to cut an expired customer
 * off - the hotspot user account (and its mac-cookie) stays valid forever
 * once created, and RouterOS's own limit-uptime only counts connected time,
 * not calendar time, so an intermittent user can easily outlive it. This is
 * the actual enforcement point: mark the subscriber expired and queue a
 * command that kicks their active session, clears their mac-cookie, and
 * removes the hotspot user so they can't be auto-logged back in.
 */
class ExpireSubscribers extends Command
{
    protected $signature = 'subscribers:expire';
    protected $description = 'Disconnect and mark expired any subscriber whose access window has passed';

    public function handle(): int
    {
        $expired = Subscriber::where('status', 'active')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->whereNotNull('router_id')
            ->whereNotNull('username')
            ->get();

        $count = 0;
        foreach ($expired as $subscriber) {
            // Atomic claim so an overlapping run never queues the disconnect twice.
            $claimed = Subscriber::whereKey($subscriber->id)->where('status', 'active')->update(['status' => 'expired']);
            if (!$claimed) {
                continue;
            }

            $u = str_replace(['"', '\\'], '', $subscriber->username);
            $script = implode("\n", [
                "/ip hotspot active remove [find user=\"{$u}\"]",
                "/ip hotspot cookie remove [find user=\"{$u}\"]",
                "/ip hotspot user remove [find name=\"{$u}\"]",
            ]);

            RouterCommand::create([
                'router_id' => $subscriber->router_id,
                'kind' => 'hotspot-user-remove',
                'label' => "Disconnect {$subscriber->username} (expired)",
                'script' => $script,
                'status' => 'pending',
            ]);

            $count++;
        }

        $this->info("Disconnected {$count} expired subscriber(s).");

        return self::SUCCESS;
    }
}
