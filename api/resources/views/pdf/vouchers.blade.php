<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; }
  .header { text-align: center; padding: 10px; border-bottom: 2px solid #16a34a; margin-bottom: 15px; }
  .header h1 { color: #16a34a; font-size: 18px; margin: 0; }
  .header p { margin: 2px 0; color: #555; }
  .grid { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 10px; }
  .voucher {
    border: 2px dashed #16a34a; border-radius: 8px;
    padding: 10px 12px; width: 160px; text-align: center;
    background: #f0fdf4;
  }
  .voucher .network { font-size: 10px; color: #666; }
  .voucher .code {
    font-size: 15px; font-weight: bold; letter-spacing: 2px;
    color: #15803d; margin: 6px 0; font-family: monospace;
  }
  .voucher .package { font-size: 10px; color: #555; }
  .voucher .price { font-weight: bold; color: #111; }
  .voucher .duration { font-size: 9px; color: #777; }
  .voucher .speed { font-size: 9px; color: #777; }
</style>
</head>
<body>
<div class="header">
  <h1>{{ $tenant->name }}</h1>
  <p>WiFi Vouchers — {{ $batch->name }}</p>
  <p>{{ now()->format('d M Y') }} | {{ count($vouchers) }} vouchers</p>
</div>
<div class="grid">
  @foreach($vouchers as $voucher)
  <div class="voucher">
    <div class="network">{{ $tenant->name }}</div>
    <div class="code">{{ $voucher->code }}</div>
    <div class="package">{{ $voucher->package->name }}</div>
    <div class="duration">{{ $voucher->package->duration_label }}</div>
    <div class="speed">{{ $voucher->package->speed_label }}</div>
    <div class="price">{{ $tenant->currency }} {{ number_format($voucher->price) }}</div>
  </div>
  @endforeach
</div>
</body>
</html>
