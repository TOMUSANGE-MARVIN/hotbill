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

// Safety net for operator payouts: settle any withdrawal left 'processing' because
// its MarzPay disbursement webhook was missed. Re-verifies against MarzPay so it
// never marks money paid without confirmation.
Schedule::command('payouts:reconcile')->everyFiveMinutes()->onOneServer()->withoutOverlapping();
