<?php

return [
    'radius_api_secret' => env('RADIUS_API_SECRET', ''),
    // Public-facing captive-portal web URL (the Next.js app).
    'portal_url' => rtrim(env('PORTAL_URL', 'https://hotbill.app'), '/'),
    'platform' => [
        // HotBill's per-transaction commission on each hotspot sale (% of gross).
        'commission_percent' => (float) env('PLATFORM_COMMISSION_PERCENT', 3),
        // HotBill's commission on each voucher redeemed (% of voucher value),
        // debited from the operator's wallet when the voucher is used.
        'voucher_commission_percent' => (float) env('VOUCHER_COMMISSION_PERCENT', 2),
        // Minimum operator wallet withdrawal.
        'min_withdrawal' => (float) env('PLATFORM_MIN_WITHDRAWAL', 1000),
        // Auto-payouts are handled by MarzPay send-money (see marzpay.payouts_enabled).
        // Until enabled, withdrawal requests queue as 'processing' for manual release.
        'payouts_enabled' => (bool) env('PLATFORM_PAYOUTS_ENABLED', false),
    ],
    'mtn_momo' => [
        'subscription_key' => env('MTN_MOMO_SUBSCRIPTION_KEY'),
        'api_user' => env('MTN_MOMO_API_USER'),
        'api_key' => env('MTN_MOMO_API_KEY'),
        'environment' => env('MTN_MOMO_ENV', 'sandbox'),
        'callback_url' => env('MTN_MOMO_CALLBACK_URL'),
    ],
    'airtel_money' => [
        'client_id' => env('AIRTEL_CLIENT_ID'),
        'client_secret' => env('AIRTEL_CLIENT_SECRET'),
        'environment' => env('AIRTEL_ENV', 'sandbox'),
    ],
    'sms' => [
        'provider' => env('SMS_PROVIDER', 'africas_talking'),
        'username' => env('SMS_USERNAME'),
        'api_key' => env('SMS_API_KEY'),
        'sender_id' => env('SMS_SENDER_ID'),
    ],
    'marzpay' => [
        'api_key' => env('MARZPAY_API_KEY'),
        'api_secret' => env('MARZPAY_API_SECRET'),
        'base_url' => rtrim(env('MARZPAY_BASE_URL', 'https://wallet.wearemarz.com/api/v1'), '/'),
        'country' => env('MARZPAY_COUNTRY', 'UG'),
        'currency' => env('MARZPAY_CURRENCY', 'UGX'),
        // MarzPay's gateway fee (% of gross) for operator-wallet accounting.
        'fee_percent' => (float) env('MARZPAY_FEE_PERCENT', 0),
        // Enable automatic operator payouts via MarzPay send-money.
        'payouts_enabled' => filter_var(env('MARZPAY_PAYOUTS_ENABLED', false), FILTER_VALIDATE_BOOL),
    ],
    'wireguard' => [
        'enabled' => env('WIREGUARD_ENABLED', true),
        'server_endpoint' => env('WIREGUARD_ENDPOINT', '207.180.249.87'),
        'server_port' => env('WIREGUARD_PORT', 51820),
        'subnet' => env('WIREGUARD_SUBNET', '10.66.0.0/24'),
        'server_vpn_ip' => env('WIREGUARD_SERVER_IP', '10.66.0.1'),
        'router_listen_port' => env('WIREGUARD_ROUTER_LISTEN_PORT', 13231),
        'peers_path' => env('WIREGUARD_PEERS_PATH', '/var/wireguard/peers'),
        'server_pubkey_path' => env('WIREGUARD_SERVER_PUBKEY_PATH', '/var/wireguard/server_public.key'),
    ],
];
