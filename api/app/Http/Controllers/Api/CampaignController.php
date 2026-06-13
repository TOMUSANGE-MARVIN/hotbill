<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\Subscriber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CampaignController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(
            Campaign::where('tenant_id', $request->user()->tenant_id)->latest()->paginate(20)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string',
            'channel' => 'required|in:sms,email,whatsapp',
            'message' => 'required|string',
            'subject' => 'nullable|string',
            'target_filter' => 'nullable|array',
            'scheduled_at' => 'nullable|date',
        ]);

        // Count recipients
        $count = $this->countRecipients($request->user()->tenant_id, $data['target_filter'] ?? []);

        $campaign = Campaign::create(array_merge($data, [
            'tenant_id' => $request->user()->tenant_id,
            'recipient_count' => $count,
            'status' => $data['scheduled_at'] ? 'scheduled' : 'draft',
        ]));

        return response()->json($campaign, 201);
    }

    public function send(Request $request, Campaign $campaign): JsonResponse
    {
        abort_if($campaign->tenant_id !== $request->user()->tenant_id, 403);

        if (!in_array($campaign->status, ['draft', 'scheduled'])) {
            return response()->json(['message' => 'Campaign already sent'], 422);
        }

        $campaign->update(['status' => 'sending']);

        // Dispatch the campaign job
        \App\Jobs\SendCampaignJob::dispatch($campaign);

        return response()->json(['message' => 'Campaign queued for sending']);
    }

    public function destroy(Request $request, Campaign $campaign): JsonResponse
    {
        abort_if($campaign->tenant_id !== $request->user()->tenant_id, 403);
        $campaign->delete();
        return response()->json(['message' => 'Deleted']);
    }

    private function countRecipients(int $tenantId, array $filter): int
    {
        $query = Subscriber::where('tenant_id', $tenantId);
        if (!empty($filter['status'])) $query->where('status', $filter['status']);
        if (!empty($filter['package_id'])) $query->where('package_id', $filter['package_id']);
        return $query->count();
    }
}
