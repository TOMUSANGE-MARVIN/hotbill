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
];
