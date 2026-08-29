<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Settle voucher expiry centrally instead of on every list read.
// onOneServer() uses the Redis cache lock so this stays correct if the api scales out.
Schedule::command('vouchers:expire')->everyFiveMinutes()->onOneServer()->withoutOverlapping();

// The actual network-side enforcement: nothing else ever removes a hotspot
// user or kicks their session when their access window passes, so an
// expired subscriber otherwise stays connected indefinitely (mac-cookie +
// limit-uptime only cap connected time, not calendar time).
Schedule::command('subscribers:expire')->everyMinute()->onOneServer()->withoutOverlapping();

// Safety net for operator payouts: settle any withdrawal left 'processing' because
// its MarzPay disbursement webhook was missed. Re-verifies against MarzPay so it
// never marks money paid without confirmation.
Schedule::command('payouts:reconcile')->everyFiveMinutes()->onOneServer()->withoutOverlapping();

// Safety net for paid orders whose hotspot user creation never got confirmed by
// the router (customer was charged but never connected) — retries the same
// stored credentials until the router confirms, then flips the order to 'paid'.
Schedule::command('orders:retry-provisioning')->everyMinute()->onOneServer()->withoutOverlapping();
