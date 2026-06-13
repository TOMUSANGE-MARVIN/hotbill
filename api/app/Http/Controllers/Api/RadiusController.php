<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Subscriber;
use App\Models\SubscriberSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Called by FreeRADIUS rlm_rest module.
 * These endpoints are NOT protected by Sanctum — secured by a shared secret header.
 */
class RadiusController extends Controller
{
    private function verifyRadiusSecret(Request $request): void
    {
        $secret = config('hotbill.radius_api_secret');
        if ($secret && $request->header('X-Radius-Secret') !== $secret) {
            abort(401, 'Unauthorized RADIUS request');
        }
    }

    // POST /api/radius/authorize
    public function authorize(Request $request): JsonResponse
    {
        $this->verifyRadiusSecret($request);

        $username = $request->input('username') ?? $request->input('User-Name');

        $subscriber = Subscriber::where('username', $username)
            ->with('package')
            ->first();

        if (!$subscriber) {
            return response()->json(['reply' => ['Reply-Message' => 'User not found']], 404);
        }

        if ($subscriber->status !== 'active') {
            return response()->json([
                'reply' => ['Reply-Message' => 'Account ' . $subscriber->status],
            ], 403);
        }

        if ($subscriber->isExpired()) {
            $subscriber->update(['status' => 'expired']);
            return response()->json(['reply' => ['Reply-Message' => 'Subscription expired']], 403);
        }

        if ($subscriber->isDataExhausted()) {
            return response()->json(['reply' => ['Reply-Message' => 'Data limit reached']], 403);
        }

        $reply = [];
        $package = $subscriber->package;

        if ($package) {
            if ($package->speed_up || $package->speed_down) {
                $reply['Mikrotik-Rate-Limit'] = $package->mikrotik_rate_limit;
            }
            if ($package->data_limit_mb) {
                $reply['Mikrotik-Total-Limit'] = $package->data_limit_mb * 1048576;
            }
            if ($package->duration_days || $package->duration_hours || $package->duration_minutes) {
                $reply['Session-Timeout'] = (($package->duration_days ?? 0) * 86400)
                    + (($package->duration_hours ?? 0) * 3600)
                    + (($package->duration_minutes ?? 0) * 60);
            }
        }

        return response()->json([
            'control' => ['Cleartext-Password' => $subscriber->password],
            'reply' => $reply,
        ]);
    }

    // POST /api/radius/accounting
    public function accounting(Request $request): JsonResponse
    {
        $this->verifyRadiusSecret($request);

        $username = $request->input('username') ?? $request->input('User-Name');
        $statusType = $request->input('Acct-Status-Type');
        $sessionId = $request->input('Acct-Session-Id');

        $subscriber = Subscriber::where('username', $username)->first();
        if (!$subscriber) return response()->json(['status' => 'ok']);

        match ($statusType) {
            'Start' => $this->handleStart($subscriber, $request, $sessionId),
            'Interim-Update' => $this->handleUpdate($subscriber, $request, $sessionId),
            'Stop' => $this->handleStop($subscriber, $request, $sessionId),
            default => null,
        };

        return response()->json(['status' => 'ok']);
    }

    private function handleStart(Subscriber $subscriber, Request $request, string $sessionId): void
    {
        SubscriberSession::create([
            'tenant_id' => $subscriber->tenant_id,
            'subscriber_id' => $subscriber->id,
            'acct_session_id' => $sessionId,
            'nas_ip' => $request->input('NAS-IP-Address'),
            'framed_ip' => $request->input('Framed-IP-Address'),
            'calling_station_id' => $request->input('Calling-Station-Id'),
            'started_at' => now(),
        ]);
    }

    private function handleUpdate(Subscriber $subscriber, Request $request, string $sessionId): void
    {
        $bytesIn = $request->input('Acct-Input-Octets', 0);
        $bytesOut = $request->input('Acct-Output-Octets', 0);

        SubscriberSession::where('acct_session_id', $sessionId)
            ->update([
                'bytes_in' => $bytesIn,
                'bytes_out' => $bytesOut,
                'session_time' => $request->input('Acct-Session-Time', 0),
            ]);

        $dataMb = round(($bytesIn + $bytesOut) / 1048576, 2);
        $subscriber->update(['data_used_mb' => DB::raw("data_used_mb + {$dataMb}")]);
    }

    private function handleStop(Subscriber $subscriber, Request $request, string $sessionId): void
    {
        $bytesIn = $request->input('Acct-Input-Octets', 0);
        $bytesOut = $request->input('Acct-Output-Octets', 0);

        SubscriberSession::where('acct_session_id', $sessionId)
            ->update([
                'bytes_in' => $bytesIn,
                'bytes_out' => $bytesOut,
                'session_time' => $request->input('Acct-Session-Time', 0),
                'terminate_cause' => $request->input('Acct-Terminate-Cause'),
                'stopped_at' => now(),
            ]);

        $dataMb = round(($bytesIn + $bytesOut) / 1048576, 2);
        $subscriber->increment('data_used_mb', $dataMb);
    }
}
