<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Router;
use App\Models\Subscriber;
use App\Services\MikrotikService;
use App\Services\RadiusService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SubscriberController extends Controller
{
    public function __construct(private RadiusService $radius) {}

    public function index(Request $request): JsonResponse
    {
        $query = Subscriber::where('tenant_id', $request->user()->tenant_id)
            ->with(['package', 'router', 'agent']);

        if ($request->search) {
            $q = $request->search;
            $query->where(fn ($q2) => $q2
                ->where('username', 'like', "%{$q}%")
                ->orWhere('full_name', 'like', "%{$q}%")
                ->orWhere('phone', 'like', "%{$q}%"));
        }

        if ($request->status) $query->where('status', $request->status);
        if ($request->router_id) $query->where('router_id', $request->router_id);
        if ($request->package_id) $query->where('package_id', $request->package_id);

        return response()->json($query->latest()->paginate(50));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'username' => 'required|string|unique:subscribers,username',
            'full_name' => 'nullable|string',
            'phone' => 'nullable|string',
            'email' => 'nullable|email',
            'type' => 'required|in:hotspot,pppoe',
            'package_id' => 'required|exists:packages,id',
            'router_id' => 'nullable|exists:routers,id',
            'agent_id' => 'nullable|exists:agents,id',
            'password' => 'nullable|string',
        ]);

        $data['tenant_id'] = $request->user()->tenant_id;
        $data['password'] = $data['password'] ?? Str::random(8);
        $data['status'] = 'active';
        $data['activated_at'] = now();

        // Set expiry from package
        $package = \App\Models\Package::find($data['package_id']);
        if ($package->duration_days || $package->duration_hours) {
            $data['expires_at'] = now()
                ->addDays($package->duration_days ?? 0)
                ->addHours($package->duration_hours ?? 0)
                ->addMinutes($package->duration_minutes ?? 0);
        }

        $subscriber = Subscriber::create($data);
        $this->radius->syncSubscriber($subscriber->load('package'));

        // Push to MikroTik if router connected
        $this->pushToMikrotik($subscriber);

        return response()->json($subscriber->load('package', 'router'), 201);
    }

    public function show(Request $request, Subscriber $subscriber): JsonResponse
    {
        $this->check_tenant($subscriber, $request);
        return response()->json($subscriber->load('package', 'router', 'agent', 'sessions'));
    }

    public function update(Request $request, Subscriber $subscriber): JsonResponse
    {
        $this->check_tenant($subscriber, $request);

        $data = $request->validate([
            'full_name' => 'nullable|string',
            'phone' => 'nullable|string',
            'email' => 'nullable|email',
            'package_id' => 'nullable|exists:packages,id',
            'router_id' => 'nullable|exists:routers,id',
            'status' => 'nullable|in:active,suspended,expired,inactive',
            'expires_at' => 'nullable|date',
            'password' => 'nullable|string',
        ]);

        $subscriber->update($data);
        $this->radius->syncSubscriber($subscriber->fresh('package'));

        return response()->json($subscriber->load('package', 'router'));
    }

    public function destroy(Request $request, Subscriber $subscriber): JsonResponse
    {
        $this->check_tenant($subscriber, $request);
        $this->radius->deleteSubscriber($subscriber->username);
        $subscriber->delete();
        return response()->json(['message' => 'Deleted']);
    }

    public function suspend(Request $request, Subscriber $subscriber): JsonResponse
    {
        $this->check_tenant($subscriber, $request);
        $subscriber->update(['status' => 'suspended']);
        $this->radius->syncSubscriber($subscriber->fresh('package'));
        $this->kickSession($subscriber);
        return response()->json(['message' => 'Suspended']);
    }

    public function activate(Request $request, Subscriber $subscriber): JsonResponse
    {
        $this->check_tenant($subscriber, $request);
        $subscriber->update(['status' => 'active', 'activated_at' => now()]);
        $this->radius->syncSubscriber($subscriber->fresh('package'));
        return response()->json(['message' => 'Activated']);
    }

    public function topup(Request $request, Subscriber $subscriber): JsonResponse
    {
        $this->check_tenant($subscriber, $request);

        $data = $request->validate([
            'amount' => 'required|numeric|min:0',
            'method' => 'required|in:mtn_momo,airtel_money,cash,card,bank',
            'package_id' => 'nullable|exists:packages,id',
            'agent_id' => 'nullable|exists:agents,id',
            'notes' => 'nullable|string',
        ]);

        $package = $data['package_id']
            ? \App\Models\Package::find($data['package_id'])
            : $subscriber->package;

        $commission = 0;
        if ($data['agent_id']) {
            $agent = \App\Models\Agent::find($data['agent_id']);
            $commission = round($data['amount'] * $agent->commission_rate / 100, 2);
            $agent->increment('total_sales', $data['amount']);
            $agent->increment('total_commission', $commission);
        }

        $transaction = \App\Models\Transaction::create([
            'tenant_id' => $request->user()->tenant_id,
            'subscriber_id' => $subscriber->id,
            'agent_id' => $data['agent_id'] ?? null,
            'package_id' => $package?->id,
            'type' => 'topup',
            'method' => $data['method'],
            'amount' => $data['amount'],
            'commission' => $commission,
            'net_amount' => $data['amount'] - $commission,
            'status' => 'completed',
            'notes' => $data['notes'] ?? null,
            'paid_at' => now(),
        ]);

        // Extend subscription
        if ($package) {
            $expiresAt = ($subscriber->expires_at && $subscriber->expires_at->isFuture())
                ? $subscriber->expires_at
                : now();

            $expiresAt = $expiresAt
                ->addDays($package->duration_days ?? 0)
                ->addHours($package->duration_hours ?? 0)
                ->addMinutes($package->duration_minutes ?? 0);

            $subscriber->update([
                'package_id' => $package->id,
                'status' => 'active',
                'expires_at' => $expiresAt,
                'activated_at' => now(),
            ]);

            $this->radius->syncSubscriber($subscriber->fresh('package'));
        }

        return response()->json(['transaction' => $transaction, 'subscriber' => $subscriber->fresh()]);
    }

    private function kickSession(Subscriber $subscriber): void
    {
        if (!$subscriber->router) return;
        try {
            $mikrotik = MikrotikService::connect_to($subscriber->router);
            $mikrotik->kickHotspotSession($subscriber->username);
            $mikrotik->disconnect();
        } catch (\Exception) {}
    }

    private function pushToMikrotik(Subscriber $subscriber): void
    {
        if (!$subscriber->router_id) return;
        $router = Router::find($subscriber->router_id);
        if (!$router || !$router->ip_address) return;
        try {
            $mikrotik = MikrotikService::connect_to($router);
            if ($subscriber->type === 'pppoe') {
                $mikrotik->addPppoeSecret($subscriber->username, $subscriber->password);
            } else {
                $mikrotik->addHotspotUser($subscriber->username, $subscriber->password);
            }
            $mikrotik->disconnect();
        } catch (\Exception) {}
    }

    private function check_tenant(Subscriber $subscriber, Request $request): void
    {
        abort_if($subscriber->tenant_id !== $request->user()->tenant_id, 403);
    }
}
