<?php

return [
    'radius_api_secret' => env('RADIUS_API_SECRET', ''),
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
