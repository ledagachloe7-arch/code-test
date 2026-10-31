<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'authentik' => [
        'base_url' => env('AUTHENTIK_BASE_URL'),
        'client_id' => env('AUTHENTIK_CLIENT_ID'),
        'client_secret' => env('AUTHENTIK_CLIENT_SECRET'),
        'redirect' => env('AUTHENTIK_REDIRECT_URI'),
        'api_token' => env('AUTHENTIK_API_TOKEN'), // Token API pour gérer les utilisateurs
    ],

    'cneddt_api' => [
        'url'=> env('CNEDDT_API_URL'),
        'key'=> env('CNEDDT_API_KEY'),
    ],

    'sms' => [
        'enabled' => env('SMS_ENABLED', false),
    ],

    'verification_code_ttl' => env('VERIFICATION_CODE_TTL', 15),

    'webpush' => [
        'public_key' => env('VAPID_PUBLIC_KEY'),
        'private_key' => env('VAPID_PRIVATE_KEY'),
    ],

    'wirepick' => [
        'client' => env('WIREPICK_CLIENT'),
        'password' => env('WIREPICK_PASSWORD'),
        'base_url' => env('WIREPICK_BASE_URL'),
    ],
        'paynala' => [
        'key' => env('PAYNALA_API_KEY'),
        'base_url' => env('PAYNALA_BASE_URL'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Moov Money (Gabon) - Paiement en ligne marchand
    |--------------------------------------------------------------------------
    | API SOAP InitTrans_OnlineMerchantPayment. Push de débit sur le téléphone du client.
    */
    'moov_money' => [
        'base_url' => env('MOOV_PAYMENT_BASE_URL'),
        'third_party_id' => env('MOOV_THIRD_PARTY_ID', 'RENGUS'),
        'password' => env('MOOV_PAYMENT_PASSWORD'),
        'result_url' => env('MOOV_RESULT_URL'),
        'initiator_identifier' => env('MOOV_INITIATOR_IDENTIFIER', 'RENGUS'),
        'security_credential' => env('MOOV_SECURITY_CREDENTIAL'),
        'channel_code' => env('MOOV_CHANNEL_CODE', '1010'),
        'merchant_shortcode' => env('MOOV_MERCHANT_SHORTCODE'),
        'requester_identifier' => env('MOOV_REQUESTER_IDENTIFIER', 'I0200'),
        'key_owner' => env('MOOV_KEY_OWNER', '1'),
        'caller_type' => env('MOOV_CALLER_TYPE', '2'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Moov / Rengus - API REST (JWT + check-order)
    |--------------------------------------------------------------------------
    | Vérification d’un OrderID (transactions Completed). Distinct du SOAP paiement marchand.
    */
    'moov_rengus' => [
        'base_url' => env('MOOV_RENGUS_API_BASE_URL', 'https://172.16.14.6:5000'),
        'username' => env('MOOV_RENGUS_USERNAME'),
        'password' => env('MOOV_RENGUS_PASSWORD'),
        'verify_ssl' => env('MOOV_RENGUS_VERIFY_SSL', false),
        'timeout' => (int) env('MOOV_RENGUS_TIMEOUT', 25),
    ],

    /*
    |--------------------------------------------------------------------------
    | Airtel SMS Service Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration pour l'envoi de SMS via Airtel Gabon ECP v6.0.0
    |
    */
    'airtel' => [
        'host'      => env('AIRTEL_SMS_HOST', 'https://messaging.airtel.ga:9002/smshttpquery/qs'),
        'username'  => env('AIRTEL_SMS_USERNAME', 'RANGUS'),
        'password'  => env('AIRTEL_SMS_PASSWORD', 'Dec@9080'),
        'sender_id' => env('AIRTEL_SMS_SENDER_ID', 'DGTT'),
    ],
    'dgdi_api'=>[
        'url'=> env('DGDI_BASE_URL')
    ],

    'sms_api' => [
        'url'=> env('SMS_API_URL'),
        'app_client_id'=>env('APP_CLIENT_ID'),
        'app_client_secret'=>env('APP_CLIENT_SECRET'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Public API (X-API-KEY)
    |--------------------------------------------------------------------------
    | Clé technique pour exposer certains endpoints sans auth.token.
    */
    'public_api' => [
        'key' => env('PUBLIC_API_KEY'),
        /** Liste d’IP autorisées (séparées par des virgules). Vide = pas de filtre (ex. dev). */
        'allowed_ips' => env('PUBLIC_API_ALLOWED_IPS', ''),
        /** Anciennes clés encore valides cryptographiquement mais à rejeter avec HTTP 403. */
        'revoked_keys' => env('PUBLIC_API_REVOKED_KEYS', ''),
    ],

];
