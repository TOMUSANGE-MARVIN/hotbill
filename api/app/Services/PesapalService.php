<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * PesaPal API 3.0 client. Handles OAuth token, IPN registration, order
 * submission (returns a hosted redirect URL), and status polling.
 *
 * @see https://developer.pesapal.com/api3/reference
 */
class PesapalService
{
    private string $base;
    private string $key;
    private string $secret;

    public function __construct()
    {
        $this->base = rtrim(config('hotbill.pesapal.base_url'), '/');
        $this->key = (string) config('hotbill.pesapal.consumer_key');
        $this->secret = (string) config('hotbill.pesapal.consumer_secret');
    }

    public function isConfigured(): bool
    {
        return $this->key !== '' && $this->secret !== '';
    }

    /**
     * Obtain (and cache for ~4 min) a bearer token. PesaPal tokens last 5 min.
     */
    public function token(): string
    {
        return Cache::remember('pesapal_token', now()->addMinutes(4), function () {
            $res = Http::acceptJson()->asJson()->post("{$this->base}/api/Auth/RequestToken", [
                'consumer_key' => $this->key,
                'consumer_secret' => $this->secret,
            ]);

            $token = $res->json('token');
            if (!$res->successful() || !$token) {
                Log::error('PesaPal token request failed', ['body' => $res->body()]);
                throw new Exception('PesaPal authentication failed');
            }

            return $token;
        });
    }

    /**
     * Register the IPN (instant payment notification) URL once and cache the id.
     */
    public function ipnId(string $notificationUrl): string
    {
        return Cache::rememberForever('pesapal_ipn_' . md5($notificationUrl), function () use ($notificationUrl) {
            $res = Http::withToken($this->token())->acceptJson()->asJson()
                ->post("{$this->base}/api/URLSetup/RegisterIPN", [
                    'url' => $notificationUrl,
                    'ipn_notification_type' => 'GET',
                ]);

            $ipnId = $res->json('ipn_id');
            if (!$res->successful() || !$ipnId) {
                Log::error('PesaPal IPN registration failed', ['body' => $res->body()]);
                throw new Exception('PesaPal IPN registration failed');
            }

            return $ipnId;
        });
    }

    /**
     * Submit an order. Returns ['order_tracking_id' => ..., 'redirect_url' => ...].
     */
    public function submitOrder(array $params): array
    {
        $res = Http::withToken($this->token())->acceptJson()->asJson()
            ->post("{$this->base}/api/Transactions/SubmitOrderRequest", $params);

        $trackingId = $res->json('order_tracking_id');
        $redirect = $res->json('redirect_url');

        if (!$res->successful() || !$trackingId || !$redirect) {
            Log::error('PesaPal SubmitOrderRequest failed', ['body' => $res->body()]);
            throw new Exception($res->json('error.message') ?? 'PesaPal order submission failed');
        }

        return [
            'order_tracking_id' => $trackingId,
            'redirect_url' => $redirect,
            'merchant_reference' => $res->json('merchant_reference'),
        ];
    }

    /**
     * Poll a transaction's status. Returns the raw PesaPal status payload;
     * payment_status_description is one of: Completed, Failed, Reversed, Invalid, Pending.
     */
    public function transactionStatus(string $orderTrackingId): array
    {
        $res = Http::withToken($this->token())->acceptJson()
            ->get("{$this->base}/api/Transactions/GetTransactionStatus", [
                'orderTrackingId' => $orderTrackingId,
            ]);

        if (!$res->successful()) {
            Log::error('PesaPal GetTransactionStatus failed', ['body' => $res->body()]);
            throw new Exception('PesaPal status check failed');
        }

        return $res->json() ?? [];
    }
}
