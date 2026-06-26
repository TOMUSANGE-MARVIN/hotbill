<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Package;
use App\Models\PortalOrder;
use App\Models\Router;
use App\Models\Transaction;
use App\Models\Voucher;
use App\Services\MarzPayService;
use App\Services\MikrotikService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Public captive-portal endpoints (no auth). A hotspot client lands here after
 * the router redirects them, picks a package, pays via MarzPay, and is then
 * auto-logged-in with a one-time hotspot credential shaped by the package.
 */
class PortalController extends Controller
{
    public function __construct(
        private MarzPayService $marzpay,
        private \App\Services\PayoutService $payouts,
    ) {}

    /**
     * Public: packages + branding for a router's captive portal.
     */
    public function packages(Router $router): JsonResponse
    {
        $packages = Package::where('tenant_id', $router->tenant_id)
            ->where('type', 'hotspot')
            ->where('is_active', true)
            ->orderBy('price')
            ->get(['id', 'name', 'description', 'price', 'currency', 'speed_up', 'speed_down', 'data_limit_mb', 'duration_days', 'duration_hours', 'duration_minutes'])
            ->map(fn ($p) => array_merge($p->toArray(), [
                'speed_label' => $p->speed_label,
                'duration_label' => $p->duration_label,
            ]));

        return response()->json([
            'router' => ['id' => $router->id, 'name' => $router->name],
            'organization' => $router->tenant?->name,
            'currency' => $router->tenant?->currency ?? config('hotbill.marzpay.currency'),
            'packages' => $packages,
        ]);
    }

    /**
     * Returns the MikroTik hotspot login.html that redirects clients to this
     * portal. The router fetches this once (via /tool fetch) into its hotspot
     * directory; MikroTik substitutes the $(...) variables at serve time.
     */
    public function loginTemplate(Router $router)
    {
        // Branded, self-contained captive portal served by the router itself.
        // It never navigates to an external site (iOS's Captive Network Assistant
        // refuses to leave for an external SPA) and talks straight to the API.
        // The $(...) tokens are MikroTik hotspot variables, substituted on serve.
        $api = rtrim(config('app.url'), '/') . '/api/v1';
        $logo = rtrim(config('hotbill.portal_url'), '/') . '/hotbill-logo.png';
        $rid = $router->id;

        $html = <<<HTML
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
<title>WiFi · HotBill</title>
<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;min-height:100%}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:linear-gradient(to bottom,#EFEFFE,#fff);color:#00012A;display:flex;align-items:center;justify-content:center;padding:16px;min-height:100vh}
.card{width:100%;max-width:384px;background:#fff;border:1px solid #eee;border-radius:20px;box-shadow:0 20px 50px rgba(0,1,42,.12);padding:22px}
.brand{display:flex;align-items:center;gap:10px;margin-bottom:18px}
.brand img{height:30px;width:auto}
.brand .o{font-weight:800;font-size:15px;line-height:1.1}
.brand .s{font-size:11px;color:#9a9aa5;margin-top:1px}
.lbl{font-size:13px;color:#6b6b76;margin:0 0 10px}
.pkg{display:flex;justify-content:space-between;align-items:center;width:100%;text-align:left;border:1px solid #e7e7ef;background:#fff;border-radius:14px;padding:14px;margin-bottom:10px;cursor:pointer;font:inherit;color:inherit}
.pkg.sel{border-color:#4F4AD7;background:#EFEFFE;box-shadow:0 0 0 2px #E1E0FC}
.pkg .n{font-weight:600;font-size:15px}
.pkg .d{font-size:12px;color:#9a9aa5;margin-top:3px}
.pkg .p{font-weight:700;color:#4F4AD7;white-space:nowrap;margin-left:10px}
.prov{display:flex;gap:8px;margin:14px 0 10px}
.prov button{flex:1;border:1px solid #e7e7ef;background:#fff;border-radius:12px;padding:11px;font-weight:600;font-size:14px;cursor:pointer;color:#6b6b76}
.prov button.mtn.on{border-color:#F5C518;background:#FEF9E7;color:#8a6d00}
.prov button.air.on{border-color:#E4002B;background:#FDECEF;color:#c0001f}
input{width:100%;border:1px solid #e7e7ef;border-radius:12px;padding:14px;font-size:16px;margin-bottom:12px;outline:none;font-family:inherit}
input:focus{border-color:#4F4AD7;box-shadow:0 0 0 2px #E1E0FC}
.btn{width:100%;background:#4F4AD7;color:#fff;border:0;border-radius:14px;padding:15px;font-size:16px;font-weight:600;cursor:pointer}
.btn:active{background:#3F3ABF}.btn:disabled{opacity:.55}
.err{color:#d33;font-size:13px;margin:8px 0 0;text-align:center}
.muted{color:#9a9aa5;font-size:13px;text-align:center;line-height:1.5;margin:6px 0}
.center{text-align:center;padding:10px 0}
.spin{width:34px;height:34px;border:3px solid #E1E0FC;border-top-color:#4F4AD7;border-radius:50%;animation:sp 1s linear infinite;margin:18px auto}
@keyframes sp{to{transform:rotate(360deg)}}
.tick{width:56px;height:56px;border-radius:50%;background:#EFEFFE;display:flex;align-items:center;justify-content:center;margin:4px auto 10px}
h3{margin:0 0 2px;font-size:19px;text-align:center}
.vc{margin-top:18px;padding-top:16px;border-top:1px solid #f0f0f5}
.vrow{display:flex;gap:8px}
.vrow input{margin-bottom:0;text-transform:uppercase;letter-spacing:1px}
.vbtn{background:#00012A;color:#fff;border:0;border-radius:12px;padding:0 16px;font-weight:600;font-size:14px;cursor:pointer;white-space:nowrap}
</style>
</head>
<body>
<div class="card" id="app"><div class="spin"></div></div>
<script>
var API="{$api}", RID={$rid}, LOGO="{$logo}";
var MAC="\$(mac)", IP="\$(ip)", LINK="\$(link-login-only)";
var pkgs=[], sel=null, prov="mtn", cur="UGX", org="WiFi Hotspot", app=document.getElementById("app");
function m(n){return Number(n).toLocaleString();}
function esc(s){return String(s==null?"":s).replace(/[<>&]/g,"");}
function head(){return '<div class="brand"><img src="'+LOGO+'" alt="HotBill" onerror="this.remove()"><div><div class="o">'+esc(org)+'</div><div class="s">Powered by HotBill</div></div></div>';}
function load(){
  fetch(API+"/portal/routers/"+RID+"/packages",{headers:{Accept:"application/json"}})
  .then(function(r){return r.json();})
  .then(function(d){pkgs=d.packages||[];cur=d.currency||"UGX";org=d.organization||"WiFi Hotspot";view();})
  .catch(function(){app.innerHTML=head()+'<p class="err">Could not load packages.</p><button class="btn" onclick="location.reload()" style="margin-top:10px">Retry</button>';});
}
function view(){
  var h=head()+'<p class="lbl">Choose a package</p><div id="list">';
  for(var i=0;i<pkgs.length;i++){var p=pkgs[i];var sub=esc(p.duration_label||"")+(p.speed_label?" · "+esc(p.speed_label):"");h+='<button class="pkg" data-i="'+i+'"><div><div class="n">'+esc(p.name)+'</div><div class="d">'+sub+'</div></div><div class="p">'+cur+" "+m(p.price)+'</div></button>';}
  h+='</div><div id="pb" style="display:none"><div class="prov"><button id="bmtn" class="mtn on">MTN MoMo</button><button id="bair" class="air">Airtel Money</button></div><input id="ph" type="tel" inputmode="tel" placeholder="07XX XXX XXX"><button class="btn" id="pay">Pay</button><p class="err" id="er"></p></div>';
  if(!pkgs.length)h+='<p class="muted">No packages available right now.</p>';
  h+='<div class="vc"><p class="lbl">Have a voucher?</p><div class="vrow"><input id="vc" placeholder="VOUCHER CODE"><button class="vbtn" id="vbtn">Redeem</button></div><p class="err" id="ver"></p></div>';
  app.innerHTML=h;
  var b=document.querySelectorAll(".pkg");
  for(var k=0;k<b.length;k++){b[k].addEventListener("click",function(){pick(parseInt(this.getAttribute("data-i"),10));});}
  if(pkgs.length){
    document.getElementById("bmtn").addEventListener("click",function(){setp("mtn");});
    document.getElementById("bair").addEventListener("click",function(){setp("airtel");});
    document.getElementById("pay").addEventListener("click",pay);
  }
  document.getElementById("vbtn").addEventListener("click",redeem);
}
function pick(i){sel=i;var b=document.querySelectorAll(".pkg");for(var j=0;j<b.length;j++){b[j].className="pkg"+(j===i?" sel":"");}document.getElementById("pb").style.display="block";document.getElementById("pay").textContent="Pay "+cur+" "+m(pkgs[i].price);}
function setp(x){prov=x;document.getElementById("bmtn").className="mtn"+(x==="mtn"?" on":"");document.getElementById("bair").className="air"+(x==="airtel"?" on":"");}
function pay(){
  var ph=document.getElementById("ph").value.replace(/\\s/g,"");
  if(sel===null||!ph){return;}
  var btn=document.getElementById("pay");btn.disabled=true;btn.textContent="Sending...";document.getElementById("er").textContent="";
  fetch(API+"/portal/pay",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({router_id:RID,package_id:pkgs[sel].id,phone:ph,provider:prov,mac:MAC,ip:IP,link_login:LINK})})
  .then(function(r){return r.json().then(function(j){return{ok:r.ok,j:j};});})
  .then(function(o){if(!o.ok){throw new Error(o.j.message||"Payment failed");}wait(o.j.reference);})
  .catch(function(e){btn.disabled=false;btn.textContent="Pay";document.getElementById("er").textContent=e.message;});
}
function redeem(){
  var code=document.getElementById("vc").value.trim();
  if(!code){return;}
  var vb=document.getElementById("vbtn");vb.disabled=true;vb.textContent="...";document.getElementById("ver").textContent="";
  fetch(API+"/portal/redeem",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({router_id:RID,code:code,mac:MAC,ip:IP,link_login:LINK})})
  .then(function(r){return r.json().then(function(j){return{ok:r.ok,j:j};});})
  .then(function(o){if(!o.ok){throw new Error(o.j.message||"Invalid voucher");}done(o.j);})
  .catch(function(e){vb.disabled=false;vb.textContent="Redeem";document.getElementById("ver").textContent=e.message;});
}
function wait(ref){
  app.innerHTML=head()+'<div class="center"><div class="spin"></div><h3>Check your phone</h3><p class="muted">Enter your Mobile Money PIN on the prompt.<br>This page updates automatically.</p></div>';
  var n=0;var t=setInterval(function(){
    n++;
    fetch(API+"/portal/orders/"+ref+"/status",{headers:{Accept:"application/json"}})
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.status==="paid"){clearInterval(t);done(d);}
      else if(d.status==="failed"||d.status==="expired"){clearInterval(t);app.innerHTML=head()+'<div class="center"><h3>Payment not completed</h3><p class="muted">Please try again.</p><button class="btn" onclick="location.reload()" style="margin-top:8px">Try again</button></div>';}
    }).catch(function(){});
    if(n>75){clearInterval(t);}
  },4000);
}
function done(d){
  var tick='<div class="tick"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4F4AD7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>';
  app.innerHTML=head()+'<div class="center">'+tick+'<h3>You are connected!</h3><p class="muted">'+(d.package?esc(d.package)+" is now active. ":"")+'Enjoy your internet.</p></div>';
  if(d.username&&LINK){try{var f=document.createElement("form");f.method="post";f.action=LINK;var u=document.createElement("input");u.name="username";u.value=d.username;var p=document.createElement("input");p.name="password";p.value=d.password||"";f.appendChild(u);f.appendChild(p);document.body.appendChild(f);f.submit();}catch(e){}}
}
load();
</script>
</body>
</html>
HTML;

        return response($html, 200)->header('Content-Type', 'text/html');
    }

    /**
     * Public: create an order and fire the MarzPay mobile-money prompt straight
     * to the customer's phone (no redirect). The portal then polls status until
     * the webhook confirms payment.
     */
    public function pay(Request $request): JsonResponse
    {
        $data = $request->validate([
            'router_id' => 'required|exists:routers,id',
            'package_id' => 'required|exists:packages,id',
            'phone' => 'required|string|max:20',
            'provider' => 'nullable|in:mtn,airtel',
            'email' => 'nullable|email',
            'mac' => 'nullable|string|max:32',
            'ip' => 'nullable|string|max:45',
            'link_login' => 'nullable|string',
        ]);

        if (!$this->marzpay->isConfigured()) {
            return response()->json(['message' => 'Payments are not configured for this portal yet.'], 503);
        }

        $router = Router::findOrFail($data['router_id']);
        $package = Package::where('id', $data['package_id'])
            ->where('tenant_id', $router->tenant_id)
            ->where('is_active', true)
            ->firstOrFail();

        $order = PortalOrder::create([
            'tenant_id' => $router->tenant_id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'phone' => $data['phone'],
            'provider' => $data['provider'] ?? null,
            'email' => $data['email'] ?? null,
            'amount' => $package->price,
            'currency' => $package->currency ?? config('hotbill.marzpay.currency'),
            'status' => 'pending',
            // MarzPay requires a UUID v4 reference; reuse it as our public reference.
            'merchant_reference' => (string) Str::uuid(),
            'client_mac' => $data['mac'] ?? null,
            'client_ip' => $data['ip'] ?? null,
            'link_login' => $data['link_login'] ?? null,
        ]);

        try {
            $result = $this->marzpay->collectMoney(
                (int) round((float) $order->amount),
                $order->phone,
                $order->merchant_reference,
                Str::limit($package->name . ' @ ' . $router->name, 90),
                rtrim(config('app.url'), '/') . '/api/v1/portal/marzpay/webhook',
            );
        } catch (\Throwable $e) {
            $order->update(['status' => 'failed']);
            Log::error('Portal payment init failed', ['order' => $order->id, 'error' => $e->getMessage()]);
            return response()->json(['message' => 'Could not start payment. Please try again.'], 502);
        }

        // Keep MarzPay's transaction uuid for the status-poll fallback.
        $order->update(['pesapal_tracking_id' => $result['transaction']['uuid'] ?? null]);

        return response()->json([
            'reference' => $order->merchant_reference,
            'prompt_sent' => true,
        ]);
    }

    /**
     * Public: redeem a pre-sold voucher. Provisions the same one-time hotspot
     * session as a paid order (so auto-login is identical) — no payment, no
     * wallet credit (the operator already collected cash for the voucher).
     */
    public function redeem(Request $request): JsonResponse
    {
        $data = $request->validate([
            'router_id' => 'required|exists:routers,id',
            'code' => 'required|string|max:40',
            'mac' => 'nullable|string|max:32',
            'ip' => 'nullable|string|max:45',
            'link_login' => 'nullable|string',
        ]);

        $router = Router::findOrFail($data['router_id']);
        $voucher = Voucher::where('code', strtoupper(trim($data['code'])))
            ->where('tenant_id', $router->tenant_id)
            ->first();

        if (!$voucher || $voucher->status !== 'unused') {
            return response()->json(['message' => 'Invalid or already-used voucher code.'], 422);
        }

        $package = $voucher->package;
        if (!$package) {
            return response()->json(['message' => 'This voucher has no package configured.'], 422);
        }

        $username = 'V' . $voucher->code;
        $password = strtoupper(Str::random(6));

        try {
            $mikrotik = MikrotikService::connect_to($router);
            $mikrotik->createHotspotSession(
                $username,
                $password,
                $package->mikrotik_rate_limit,
                $package->mikrotik_limit_uptime ?: null,
                $package->data_limit_bytes,
            );
            // Log the device in directly so it connects without the browser.
            if (!empty($data['mac']) && !empty($data['ip'])) {
                try {
                    $mikrotik->loginHotspotUser($username, $password, $data['mac'], $data['ip']);
                } catch (\Throwable $e) {
                    Log::warning('Voucher server-side login failed (browser fallback applies)', ['error' => $e->getMessage()]);
                }
            }
            $mikrotik->disconnect();
        } catch (\Throwable $e) {
            Log::error('Portal voucher provisioning failed', ['voucher' => $voucher->id, 'error' => $e->getMessage()]);
            return response()->json(['message' => 'Could not activate your voucher. Please try again.'], 502);
        }

        $expiresAt = $package->mikrotik_limit_uptime
            ? now()->addDays($package->duration_days ?? 0)->addHours($package->duration_hours ?? 0)->addMinutes($package->duration_minutes ?? 0)
            : null;

        $voucher->update([
            'status' => 'active',
            'router_id' => $router->id,
            'used_by_username' => $username,
            'used_at' => now(),
            'expires_at' => $expiresAt,
        ]);

        Transaction::create([
            'tenant_id' => $voucher->tenant_id,
            'voucher_id' => $voucher->id,
            'package_id' => $package->id,
            'reference' => 'VCH-' . $voucher->code,
            'type' => 'voucher',
            'method' => 'cash',
            'amount' => $voucher->price,
            'net_amount' => $voucher->price,
            'currency' => $router->tenant?->currency ?? config('hotbill.marzpay.currency'),
            'status' => 'completed',
            'notes' => 'Captive portal voucher redemption',
            'paid_at' => now(),
        ]);

        return response()->json([
            'status' => 'paid',
            'package' => $package->name,
            'username' => $username,
            'password' => $password,
            'link_login' => $data['link_login'] ?? null,
        ]);
    }

    /**
     * Public: portal polls this by merchant_reference. Re-checks MarzPay if still
     * pending (covers delayed webhook), and returns credentials once paid.
     */
    public function status(string $reference): JsonResponse
    {
        $order = PortalOrder::where('merchant_reference', $reference)->firstOrFail();

        if ($order->status === 'pending' && $order->pesapal_tracking_id) {
            try {
                $this->reconcile($order);
            } catch (\Throwable $e) {
                Log::warning('Portal status reconcile failed', ['order' => $order->id, 'error' => $e->getMessage()]);
            }
        }

        return response()->json([
            'status' => $order->status,
            'package' => $order->package?->name,
            'username' => $order->status === 'paid' ? $order->hotspot_username : null,
            'password' => $order->status === 'paid' ? $order->hotspot_password : null,
            'link_login' => $order->status === 'paid' ? $order->link_login : null,
        ]);
    }

    /**
     * Verify a MarzPay collection against the API (the webhook is unsigned, so we
     * always re-check before fulfilling). Idempotent — a no-op once paid.
     */
    private function reconcile(PortalOrder $order): void
    {
        if ($order->status === 'paid') return;
        if (!$order->pesapal_tracking_id) return;

        $data = $this->marzpay->getCollectionDetails($order->pesapal_tracking_id);
        $txn = $data['data']['transaction'] ?? $data['transaction'] ?? [];
        $st = strtolower($txn['status'] ?? '');
        $providerName = $data['data']['collection']['provider'] ?? $order->provider ?? '';

        if (in_array($st, ['completed', 'successful', 'success'])) {
            $this->fulfill($order, $providerName);
        } elseif (in_array($st, ['failed', 'declined', 'cancelled', 'reversed'])) {
            $order->update(['status' => 'failed']);
        }
        // 'processing'/'pending' → leave as-is, portal keeps polling
    }

    /**
     * Public: MarzPay collection webhook. Re-verifies against the API, then
     * fulfills. Returns 200 regardless so MarzPay doesn't retry needlessly.
     */
    public function marzpayWebhook(Request $request): JsonResponse
    {
        $event = (string) $request->input('event_type');
        $reference = $request->input('transaction.reference');

        if ($reference && str_starts_with($event, 'collection.')) {
            $order = PortalOrder::where('merchant_reference', $reference)->first();
            if ($order) {
                try {
                    $this->reconcile($order);
                } catch (\Throwable $e) {
                    Log::error('MarzPay webhook reconcile failed', ['ref' => $reference, 'error' => $e->getMessage()]);
                }
            }
        }

        return response()->json(['status' => 'ok']);
    }

    /**
     * Public: MarzPay disbursement (operator payout) webhook.
     */
    public function marzpayPayoutWebhook(Request $request): JsonResponse
    {
        try {
            $this->payouts->handleDisbursementWebhook($request->all());
        } catch (\Throwable $e) {
            Log::error('MarzPay payout webhook failed', ['error' => $e->getMessage()]);
        }

        return response()->json(['status' => 'ok']);
    }

    /**
     * Create the one-time hotspot user on the router and mark the order paid.
     */
    private function fulfill(PortalOrder $order, ?string $paymentMethod = null): void
    {
        // Atomic claim — the webhook and the status-poll can fire fulfill() at the
        // same time; only the caller that flips pending→paid proceeds, so the
        // wallet is credited once and the transaction is inserted once.
        $claimed = PortalOrder::whereKey($order->id)->where('status', '!=', 'paid')->update(['status' => 'paid']);
        if ($claimed === 0) return;

        $package = $order->package;
        $router = $order->router;

        $username = preg_replace('/\D/', '', $order->phone) ?: ('u' . $order->id);
        $password = strtoupper(Str::random(6));

        $mikrotik = MikrotikService::connect_to($router);
        $mikrotik->createHotspotSession(
            $username,
            $password,
            $package->mikrotik_rate_limit,
            $package->mikrotik_limit_uptime ?: null,
            $package->data_limit_bytes,
        );
        // Log the device in directly so it connects without relying on the phone
        // browser posting to the MikroTik login (mixed-content / DNS can block it).
        if ($order->client_mac && $order->client_ip) {
            try {
                $mikrotik->loginHotspotUser($username, $password, $order->client_mac, $order->client_ip);
            } catch (\Throwable $e) {
                Log::warning('Hotspot server-side login failed (browser fallback applies)', [
                    'order' => $order->id, 'error' => $e->getMessage(),
                ]);
            }
        }
        $mikrotik->disconnect();

        // Fee split: payment-gateway fee + HotBill platform commission; operator keeps the rest.
        $gross = (float) $order->amount;
        $gatewayFee = round($gross * (float) config('hotbill.marzpay.fee_percent') / 100, 2);
        $platformFee = round($gross * (float) config('hotbill.platform.commission_percent') / 100, 2);
        $operatorNet = round($gross - $gatewayFee - $platformFee, 2);

        $order->update([
            'status' => 'paid',
            'paid_at' => now(),
            'payment_method' => $paymentMethod,
            'hotspot_username' => $username,
            'hotspot_password' => $password,
            'gateway_fee' => $gatewayFee,
            'platform_fee' => $platformFee,
            'operator_net' => $operatorNet,
        ]);

        // Credit the operator's logical wallet with their net earnings.
        $walletTxn = $order->tenant?->postWallet('credit', $operatorNet, 'sale', [
            'reference' => $order->merchant_reference,
            'description' => 'Hotspot sale: ' . ($package->name ?? 'package'),
            'meta' => [
                'gross' => $gross,
                'gateway_fee' => $gatewayFee,
                'platform_fee' => $platformFee,
                'phone' => $order->phone,
            ],
        ]);

        // The fee charged to the operator on this sale (gateway + platform).
        $fee = round($gatewayFee + $platformFee, 2);

        Transaction::create([
            'tenant_id' => $order->tenant_id,
            'package_id' => $order->package_id,
            'reference' => $order->merchant_reference,
            'type' => 'subscription',
            'method' => $this->mapMethod((string) $paymentMethod),
            'amount' => $order->amount,
            'commission' => $fee,
            'net_amount' => $operatorNet,
            'currency' => $order->currency,
            'status' => 'completed',
            'external_reference' => $order->pesapal_tracking_id,
            'phone' => $order->phone,
            'notes' => 'Captive portal hotspot purchase',
            'paid_at' => now(),
            'meta' => [
                'gateway_fee' => $gatewayFee,
                'platform_fee' => $platformFee,
                'balance_after' => $walletTxn ? (float) $walletTxn->balance_after : null,
            ],
        ]);
    }

    private function mapMethod(string $method): string
    {
        $m = strtolower($method);
        if (str_contains($m, 'airtel')) return 'airtel_money';
        if (str_contains($m, 'mtn') || str_contains($m, 'momo') || str_contains($m, 'mpesa')) return 'mtn_momo';
        if (str_contains($m, 'visa') || str_contains($m, 'master') || str_contains($m, 'card')) return 'card';
        return 'mtn_momo';
    }
}
