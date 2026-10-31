<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Exception;

class SmsService
{
    protected string $baseUrl;
    protected string $clientId;
    protected string $clientSecret;

    public function __construct()
    {
        $this->baseUrl = config('services.sms_api.url');
        $this->clientId = config('services.sms_api.app_client_id');
        $this->clientSecret = config('services.sms_api.app_client_secret');
    }

    public function send(string $phone, string $templateIdentifier, array $variables): array
    {
        $token = $this->getAccessToken();

        $response = Http::withToken($token)
            ->timeout(10)
            ->retry(3, 1000) // retry 3 fois avec 1s interval
            ->post($this->baseUrl . '/api/v1/messages/sms', [
                'recipient_number' => $phone,
                'template_identifier' => $templateIdentifier,
                'from' => 'DGTT',
                'variables' => $variables,
            ]);


        if ($response->failed()) {
            Log::error('SMS sending failed', [
                'response' => $response->body()
            ]);

            throw new Exception('SMS sending failed');
        }

        return $response->json();
    }

    protected function getAccessToken(): string
    {
        $response = Http::timeout(10)
                ->post($this->baseUrl . '/api/v1/auth/login', [
                    'app_client_id' => $this->clientId,
                    'app_client_secret' => $this->clientSecret,
                ]);

            if ($response->failed()) {
                throw new Exception('Authentication to SMS API failed');
            }

            return $response->json()['data']['access_token'];
    }
}