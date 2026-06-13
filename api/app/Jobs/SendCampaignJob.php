<?php

namespace App\Jobs;

use App\Models\Campaign;
use App\Models\Subscriber;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendCampaignJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(private Campaign $campaign) {}

    public function handle(): void
    {
        $filter = $this->campaign->target_filter ?? [];

        $query = Subscriber::where('tenant_id', $this->campaign->tenant_id)
            ->whereNotNull('phone');

        if (!empty($filter['status'])) $query->where('status', $filter['status']);
        if (!empty($filter['package_id'])) $query->where('package_id', $filter['package_id']);

        $sent = 0;
        $failed = 0;

        $query->chunk(100, function ($subscribers) use (&$sent, &$failed) {
            foreach ($subscribers as $subscriber) {
                try {
                    $this->sendMessage($subscriber->phone, $this->campaign->message);
                    $sent++;
                } catch (\Exception $e) {
                    Log::warning("Campaign send failed for {$subscriber->phone}: " . $e->getMessage());
                    $failed++;
                }
            }
        });

        $this->campaign->update([
            'status' => 'sent',
            'sent_count' => $sent,
            'failed_count' => $failed,
            'sent_at' => now(),
        ]);
    }

    private function sendMessage(string $phone, string $message): void
    {
        // Plug in your SMS gateway here (Africa's Talking, Twilio, etc.)
        // Example: AfricasTalking::sms()->send(['to' => $phone, 'message' => $message]);
        Log::info("SMS to {$phone}: {$message}");
    }
}
