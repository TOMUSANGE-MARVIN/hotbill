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

    /**
     * Download a Word (.docx) file of unused ("never used") vouchers for the
     * tenant, optionally limited to a creation-date range so operators can
     * export only newly generated codes and avoid re-printing distributed ones.
     */
    public function exportDocx(Request $request): \Illuminate\Http\Response
    {
        $tenantId = $request->user()->tenant_id;
        Voucher::expireStale($tenantId);

        $from = $request->input('from');
        $to = $request->input('to');

        $vouchers = Voucher::where('tenant_id', $tenantId)
            ->where('status', 'unused')
            ->when($from, fn ($q) => $q->whereDate('created_at', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('created_at', '<=', $to))
            ->with('package')
            ->orderBy('created_at')
            ->get();

        $binary = $this->buildVoucherDocx($vouchers, $request->user()->tenant, $from, $to);

        $label = ($from ?: 'all') . ($to ? "_to_{$to}" : '');
        return response($binary, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition' => 'attachment; filename="vouchers-' . $label . '.docx"',
        ]);
    }

    /** Assemble a minimal, valid .docx (Open XML zip) listing the vouchers. */
    private function buildVoucherDocx($vouchers, $tenant, ?string $from, ?string $to): string
    {
        $currency = $tenant->currency ?? 'UGX';
        $rangeLabel = ($from || $to)
            ? 'Created ' . ($from ?: '…') . ' to ' . ($to ?: '…')
            : 'All unused vouchers';
        $meta = $rangeLabel . '  ·  ' . $vouchers->count() . ' voucher(s)  ·  generated ' . now()->format('d M Y H:i');

        $rows = $this->docxRow(['Code', 'Package', 'Price'], true);
        foreach ($vouchers as $v) {
            $rows .= $this->docxRow([
                $v->code,
                $v->package->name ?? '-',
                number_format((float) $v->price, 0) . ' ' . $currency,
            ], false);
        }

        $border = fn ($e) => '<w:' . $e . ' w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>';
        $documentXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
            . $this->docxHeading(($tenant->name ?? 'HotBill') . ' - WiFi Vouchers')
            . $this->docxPara($meta)
            . '<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>'
            . $border('top') . $border('left') . $border('bottom') . $border('right')
            . $border('insideH') . $border('insideV')
            . '</w:tblBorders></w:tblPr>' . $rows . '</w:tbl>'
            . '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>'
            . '</w:body></w:document>';

        $tmp = tempnam(sys_get_temp_dir(), 'docx');
        $zip = new \ZipArchive();
        $zip->open($tmp, \ZipArchive::OVERWRITE);
        $zip->addFromString('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
        $zip->addFromString('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
        $zip->addFromString('word/document.xml', $documentXml);
        $zip->close();
        $binary = (string) file_get_contents($tmp);
        @unlink($tmp);

        return $binary;
    }

    private function docxEsc(string $s): string
    {
        return htmlspecialchars($s, ENT_QUOTES | ENT_XML1, 'UTF-8');
    }

    private function docxHeading(string $text): string
    {
        return '<w:p><w:pPr><w:spacing w:after="120"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr>'
            . '<w:t xml:space="preserve">' . $this->docxEsc($text) . '</w:t></w:r></w:p>';
    }

    private function docxPara(string $text): string
    {
        return '<w:p><w:pPr><w:spacing w:after="240"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="666666"/></w:rPr>'
            . '<w:t xml:space="preserve">' . $this->docxEsc($text) . '</w:t></w:r></w:p>';
    }

    /** @param array<int,string> $cells */
    private function docxRow(array $cells, bool $header): string
    {
        $tr = '<w:tr>';
        foreach ($cells as $c) {
            $rpr = $header ? '<w:rPr><w:b/></w:rPr>' : '';
            $shd = $header ? '<w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="F3F4F6"/></w:tcPr>' : '<w:tcPr/>';
            $tr .= '<w:tc>' . $shd . '<w:p><w:r>' . $rpr
                . '<w:t xml:space="preserve">' . $this->docxEsc((string) $c) . '</w:t></w:r></w:p></w:tc>';
        }

        return $tr . '</w:tr>';
    }

    public function revoke(Request $request, Voucher $voucher): JsonResponse
    {
        abort_if($voucher->tenant_id !== $request->user()->tenant_id, 403);
        $voucher->update(['status' => 'revoked']);
        return response()->json(['message' => 'Revoked']);
    }
}
