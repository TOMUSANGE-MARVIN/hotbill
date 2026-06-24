<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * MarzPay client — direct MTN/Airtel collections (the customer gets a PIN
 * prompt straight on their phone, no hosted redirect) and automatic
 * disbursements (send-money) for operator payouts.
 *
 * Auth: HTTP Basic with the API key as username and the API secret as
 * password (i.e. base64("key:secret")).
 *
 * @see https://wallet.wearemarz.com/documentation
 */
class MarzPayService
{
    private string $base;
    private string $key;
    private string $secret;
    private string $country;

    public function __construct()
    {
        $this->base = rtrim((string) config('hotbill.marzpay.base_url'), '/');
        $this->key = (string) config('hotbill.marzpay.api_key');
        $this->secret = (string) config('hotbill.marzpay.api_secret');
        $this->country = (string) config('hotbill.marzpay.country', 'UG');
    }

    public function isConfigured(): bool
    {
        return $this->key !== '' && $this->secret !== '';
    }

    /**
     * Normalise a Ugandan number to MarzPay's +256XXXXXXXXX format.
     */
    public static function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone);
        if (str_starts_with($digits, '256')) {
            $digits = substr($digits, 3);
        }
        $digits = ltrim($digits, '0');
        return '+256' . $digits;
    }

    /**
     * Request a mobile-money payment. The customer immediately gets a PIN
     * prompt on their phone. Returns the MarzPay transaction payload (uuid,
     * reference, status). Final outcome arrives via the webhook.
     */
    public function collectMoney(int $amount, string $phone, string $reference, ?string $description = null, ?string $callbackUrl = null): array
    {
        return $this->post('/collect-money', array_filter([
            'amount' => $amount,
            'phone_number' => self::normalizePhone($phone),
            'country' => $this->country,
            'reference' => $reference,
            'method' => 'mobile_money',
            'description' => $description,
            'callback_url' => $callbackUrl,
        ], fn ($v) => $v !== null), 'collection');
    }

    /**
     * Disburse money to a recipient's mobile money (operator payout).
     */
    public function sendMoney(int $amount, string $phone, string $reference, ?string $description = null, ?string $callbackUrl = null): array
    {
        return $this->post('/send-money', array_filter([
            'amount' => $amount,
            'phone_number' => self::normalizePhone($phone),
            'country' => $this->country,
            'reference' => $reference,
            'description' => $description,
            'callback_url' => $callbackUrl,
        ], fn ($v) => $v !== null), 'disbursement');
    }

    /**
     * Poll a collection's status (used as a webhook-delay fallback).
     */
    public function getCollectionDetails(string $uuid): array
    {
        $res = Http::withBasicAuth($this->key, $this->secret)->acceptJson()
            ->get("{$this->base}/collect-money/{$uuid}");

        return $res->json() ?? [];
    }

    public function getSendMoneyDetails(string $uuid): array
    {
        $res = Http::withBasicAuth($this->key, $this->secret)->acceptJson()
            ->get("{$this->base}/send-money/{$uuid}");

        return $res->json() ?? [];
    }

    private function post(string $path, array $body, string $what): array
    {
        $res = Http::withBasicAuth($this->key, $this->secret)->acceptJson()->asJson()
            ->post($this->base . $path, $body);

        $json = $res->json() ?? [];

        if (!$res->successful() || ($json['status'] ?? null) !== 'success') {
            Log::error("MarzPay {$what} request failed", ['status' => $res->status(), 'body' => $res->body()]);
            throw new Exception($json['message'] ?? "MarzPay {$what} request failed");
        }

        return $json['data'] ?? [];
    }
}
