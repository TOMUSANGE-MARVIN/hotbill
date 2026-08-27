<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  /* dompdf has no flexbox support, so a fixed table is the only reliable way
     to get an even multi-column grid. 4 vouchers per row to save paper. */
  @page { margin: 12px; }
  body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; }
  .header { text-align: center; padding: 6px; border-bottom: 2px solid #16a34a; margin-bottom: 10px; }
  .header h1 { color: #16a34a; font-size: 18px; margin: 0; }
  .header p { margin: 2px 0; color: #555; }
  table.grid { width: 100%; border-collapse: separate; border-spacing: 6px; table-layout: fixed; }
  td.cell { width: 25%; vertical-align: top; padding: 0; }
  .voucher {
    border: 2px dashed #16a34a; border-radius: 8px;
    padding: 8px 6px; text-align: center; background: #f0fdf4;
  }
  .voucher .network { font-size: 9px; color: #666; }
  .voucher .code {
    font-size: 15px; font-weight: bold; letter-spacing: 2px;
    color: #15803d; margin: 5px 0; font-family: monospace;
  }
  .voucher .package { font-size: 10px; color: #555; }
  .voucher .duration, .voucher .speed { font-size: 9px; color: #777; }
  .voucher .price { font-weight: bold; color: #111; margin-top: 3px; }
</style>
</head>
<body>
<div class="header">
  <h1>{{ $tenant->name }}</h1>
  <p>WiFi Vouchers — {{ $batch->name }}</p>
  <p>{{ now()->format('d M Y') }} | {{ count($vouchers) }} vouchers</p>
</div>
<table class="grid">
  @foreach($vouchers->chunk(4) as $row)
  <tr>
    @foreach($row as $voucher)
    <td class="cell">
      <div class="voucher">
        <div class="network">{{ $tenant->name }}</div>
        <div class="code">{{ $voucher->code }}</div>
        <div class="package">{{ $voucher->package->name }}</div>
        <div class="duration">{{ $voucher->package->duration_label }}</div>
        <div class="speed">{{ $voucher->package->speed_label }}</div>
        <div class="price">{{ $tenant->currency }} {{ number_format($voucher->price) }}</div>
      </div>
    </td>
    @endforeach
    {{-- pad the last row so 4 columns stay aligned --}}
    @for($i = $row->count(); $i < 4; $i++)<td class="cell"></td>@endfor
  </tr>
  @endforeach
</table>
</body>
</html>
