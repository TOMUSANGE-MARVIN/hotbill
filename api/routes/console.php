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

// Real hotspot data usage - a router-side scheduler for this failed silently
// (see CollectUsageReports), so the server queues the same command through
// the already-reliable poll/command queue instead.
Schedule::command('usage:collect')->everyFiveMinutes()->onOneServer()->withoutOverlapping();

// A voucher only counts as a sale once the device is confirmed online, not
// just because the hotspot account was created - but submitting the login
// form navigates the customer's browser away, so their own status poll may
// never fire again. This is what actually resolves 'connecting' vouchers
// either way even when nobody's left watching the page.
Schedule::command('vouchers:confirm-connections')->everyMinute()->onOneServer()->withoutOverlapping();

// Safety net for operator payouts: settle any withdrawal left 'processing' because
// its MarzPay disbursement webhook was missed. Re-verifies against MarzPay so it
// never marks money paid without confirmation.
Schedule::command('payouts:reconcile')->everyFiveMinutes()->onOneServer()->withoutOverlapping();

// Safety net for paid orders whose hotspot user creation never got confirmed by
// the router (customer was charged but never connected) - retries the same
// stored credentials until the router confirms, then flips the order to 'paid'.
Schedule::command('orders:retry-provisioning')->everyMinute()->onOneServer()->withoutOverlapping();

// fulfill()'s atomic 'fulfilling' claim was a one-way door with no recovery if
// anything interrupted it mid-flight (an exception, a killed request) -
// exactly what stranded a real paying customer when a cross-tenant
// subscribers.username collision threw partway through. This is the general
// safety net so no future interruption can do that again.
Schedule::command('orders:retry-stuck-fulfillment')->everyMinute()->onOneServer()->withoutOverlapping();
