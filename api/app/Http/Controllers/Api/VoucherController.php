<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Voucher;
use App\Models\VoucherBatch;
use App\Services\RadiusService;
use App\Services\VoucherService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VoucherController extends Controller
{
    public function __construct(
        private VoucherService $voucherService,
        private RadiusService $radiusService,
    ) {}

    public function batches(Request $request): JsonResponse
    {
        // Settle expiry first so the per-batch used/remaining counts are accurate.
        Voucher::expireStale($request->user()->tenant_id);

        $batches = VoucherBatch::where('tenant_id', $request->user()->tenant_id)
            ->with('package', 'agent')
            ->withCount(['vouchers', 'vouchers as used_vouchers_count' => fn ($q) => $q->where('status', '!=', 'unused')])
            ->latest()
            ->paginate(20);

        return response()->json($batches);
    }

    public function createBatch(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string',
            'package_id' => 'required|exists:packages,id',
            'quantity' => 'required|integer|min:1|max:5000',
            'code_length' => 'nullable|integer|min:6|max:16',
            'prefix' => 'nullable|string|max:5',
            'agent_id' => 'nullable|exists:agents,id',
        ]);

        $package = \App\Models\Package::find($data['package_id']);

        $batch = VoucherBatch::create(array_merge($data, [
            'tenant_id' => $request->user()->tenant_id,
            'unit_price' => $package->price,
            'code_length' => $data['code_length'] ?? 8,
        ]));

        $this->voucherService->generateBatch($batch);

        return response()->json($batch->load('package'), 201);
    }

    public function index(Request $request): JsonResponse
    {
        // Lazily settle expiry so the listing never shows an expired voucher as active.
        Voucher::expireStale($request->user()->tenant_id);

        $query = Voucher::where('tenant_id', $request->user()->tenant_id)
            ->with('package', 'batch');

        if ($request->batch_id) $query->where('batch_id', $request->batch_id);
        if ($request->status) $query->where('status', $request->status);
        if ($request->search) $query->where('code', 'like', '%' . $request->search . '%');

        return response()->json($query->latest()->paginate(100));
    }

    public function redeem(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => 'required|string',
            'username' => 'required|string',
        ]);

        $voucher = Voucher::where('code', strtoupper($data['code']))
            ->where('tenant_id', $request->user()->tenant_id)
            ->with('package')
            ->first();

        if (!$voucher) {
            return response()->json(['message' => 'Invalid voucher code'], 404);
        }

        try {
            $subscriber = $this->voucherService->redeem($voucher, $data['username'], $this->radiusService);
            return response()->json(['subscriber' => $subscriber, 'voucher' => $voucher->fresh()]);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function print(Request $request, VoucherBatch $batch): \Illuminate\Http\Response
    {
        abort_if($batch->tenant_id !== $request->user()->tenant_id, 403);

        $vouchers = $batch->vouchers()->with('package')->where('status', 'unused')->get();
        $tenant = $request->user()->tenant;

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.vouchers', compact('vouchers', 'batch', 'tenant'));
        return $pdf->download("vouchers-{$batch->name}.pdf");
    }

    public function revoke(Request $request, Voucher $voucher): JsonResponse
    {
        abort_if($voucher->tenant_id !== $request->user()->tenant_id, 403);
        $voucher->update(['status' => 'revoked']);
        return response()->json(['message' => 'Revoked']);
    }
}
