<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * API REST Rengus / Moov Money : JWT (/get-token) et vérification de commande (/check-order).
 * Distinct du flux SOAP InitTrans (PaiementMoovService).
 */
class MoovRengusApiService
{
    protected function baseUrl(): string
    {
        return rtrim((string) config('services.moov_rengus.base_url'), '/');
    }

    protected function httpOptions(): array
    {
        return [
            'verify' => filter_var(config('services.moov_rengus.verify_ssl'), FILTER_VALIDATE_BOOLEAN),
        ];
    }

    /**
     * Obtient un JWT (mis en cache jusqu’à expires_in - 2 min).
     */
    public function getAccessToken(): ?string
    {
        $cached = Cache::get('moov_rengus_access_token');
        if (is_string($cached) && $cached !== '') {
            return $cached;
        }

        $base = $this->baseUrl();
        $username = (string) config('services.moov_rengus.username');
        $password = (string) config('services.moov_rengus.password');

        if ($base === '' || $username === '' || $password === '') {
            Log::warning('[MoovRengus] Configuration incomplète (base_url, username ou password)');

            return null;
        }

        try {
            $response = Http::timeout((int) config('services.moov_rengus.timeout', 20))
                ->withOptions($this->httpOptions())
                ->acceptJson()
                ->asJson()
                ->post($base.'/get-token', [
                    'username' => $username,
                    'password' => $password,
                ]);
        } catch (\Throwable $e) {
            Log::error('[MoovRengus] get-token exception', ['error' => $e->getMessage()]);

            return null;
        }

        if (!$response->successful()) {
            Log::warning('[MoovRengus] get-token HTTP error', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return null;
        }

        $json = $response->json();
        $token = $json['access_token'] ?? null;
        if (!is_string($token) || $token === '') {
            Log::warning('[MoovRengus] get-token sans access_token', ['json' => $json]);

            return null;
        }

        $expiresIn = (int) ($json['expires_in'] ?? 3600);
        $ttl = max(60, $expiresIn - 120);
        Cache::put('moov_rengus_access_token', $token, now()->addSeconds($ttl));

        return $token;
    }

    /**
     * Appelle POST /check-order avec OrderID (sensible à la casse côté Moov).
     *
     * @return array{
     *   transport_ok: bool,
     *   status: int,
     *   moov_json: ?array,
     *   error?: string
     * }
     */
    public function checkOrder(string $orderId): array
    {
        $token = $this->getAccessToken();
        if ($token === null) {
            return [
                'transport_ok' => false,
                'status' => 0,
                'moov_json' => null,
                'error' => 'Impossible d\'obtenir un token JWT Rengus (vérifiez MOOV_RENGUS_* dans .env).',
            ];
        }

        $base = $this->baseUrl();

        try {
            $response = Http::timeout((int) config('services.moov_rengus.timeout', 25))
                ->withOptions($this->httpOptions())
                ->withToken($token)
                ->acceptJson()
                ->asJson()
                ->post($base.'/check-order', [
                    'OrderID' => $orderId,
                ]);
        } catch (\Throwable $e) {
            Log::error('[MoovRengus] check-order exception', ['order_id' => $orderId, 'error' => $e->getMessage()]);

            return [
                'transport_ok' => false,
                'status' => 0,
                'moov_json' => null,
                'error' => 'Erreur de connexion au service Rengus: '.$e->getMessage(),
            ];
        }

        $json = $response->json();
        if (!is_array($json)) {
            $json = null;
        }

        return [
            'transport_ok' => true,
            'status' => $response->status(),
            'moov_json' => $json,
        ];
    }

    public function clearTokenCache(): void
    {
        Cache::forget('moov_rengus_access_token');
    }
}
