<?php

namespace App\Http\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\Dossier;
use Illuminate\Support\Str;

class DossierService
{
    /**
     * Envoie un seul dossier au CNEDDT.
     */
    public function sendToCneddt(array $payload): array
    {
        $service = config('services.cneddt_api');

        if (!isset($service['url']) || !isset($service['key']) || empty($service['url']) || empty($service['key'])) {
            \Illuminate\Support\Facades\Log::warning('Configuration CNEDDT API manquante. L\'envoi au CNEDDT sera ignoré.');
            return [
                'success' => false,
                'message' => 'Configuration CNEDDT API manquante. L\'envoi au CNEDDT a été ignoré.',
                'skipped' => true,
            ];
        }

        try {
            $response = Http::withHeaders([
                'X-API-KEY' => $service['key'],
                'Accept' => 'application/json',
            ])
                ->asJson()
                ->post($service['url'], $payload);

            if ($response->successful()) {
                $json = $response->json();
                $payload = is_array($json) ? $json : null;
                $businessOk = self::cneddtResponseIndicatesSuccess($payload);

                return [
                    'success' => $businessOk,
                    'data' => $payload,
                    'http_status' => $response->status(),
                ];
            }

            return [
                'success' => false,
                'status' => $response->status(),
                'body' => $response->body(),
            ];
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Erreur lors de l\'envoi au CNEDDT', [
                'error' => $e->getMessage(),
                'payload' => $payload,
            ]);
            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Envoie plusieurs dossiers au CNEDDT en parallèle (1 requête HTTP par dossier).
     * Chaque entrée de $items doit être [ 'dossier_id' => uuid, 'payload' => array ].
     * Le POST JSON vers le CNEDDT est typiquement { "data": { "dossier_id": "…", … } } (voir buildPayloadForTransfert).
     * Retourne un tableau de [ 'dossier_id' => uuid, 'result' => array ] dans le même ordre.
     */
    public function sendManyToCneddt(array $items): array
    {
        if (empty($items)) {
            return [];
        }

        $service = config('services.cneddt_api');

        if (!isset($service['url']) || !isset($service['key']) || empty($service['url']) || empty($service['key'])) {
            \Illuminate\Support\Facades\Log::warning('Configuration CNEDDT API manquante. Envoi en masse au CNEDDT ignoré.');
            $skipped = [
                'success' => false,
                'message' => 'Configuration CNEDDT API manquante. L\'envoi au CNEDDT a été ignoré.',
                'skipped' => true,
            ];
            return array_map(fn($item) => [
                'dossier_id' => $item['dossier_id'],
                'result' => $skipped,
            ], $items);
        }

        $url = $service['url'];
        $key = $service['key'];

        $responses = Http::pool(function ($pool) use ($items, $url, $key) {
            foreach ($items as $item) {
                $pool->as($item['dossier_id'])
                    ->withHeaders([
                        'X-API-KEY' => $key,
                        'Accept' => 'application/json',
                    ])
                    ->asJson()
                    ->post($url, $item['payload']);
            }
        });

        $results = [];
        foreach ($items as $item) {
            $dossierId = $item['dossier_id'];
            $response = $responses[$dossierId] ?? null;

            if ($response === null) {
                $results[] = [
                    'dossier_id' => $dossierId,
                    'result' => ['success' => false, 'message' => 'Réponse manquante'],
                ];
                continue;
            }

            try {
                if ($response->successful()) {
                    $json = $response->json();
                    $payload = is_array($json) ? $json : null;
                    $businessOk = self::cneddtResponseIndicatesSuccess($payload);

                    $results[] = [
                        'dossier_id' => $dossierId,
                        'result' => [
                            'success' => $businessOk,
                            'data' => $payload,
                            'http_status' => $response->status(),
                        ],
                    ];
                } else {
                    $results[] = [
                        'dossier_id' => $dossierId,
                        'result' => [
                            'success' => false,
                            'status' => $response->status(),
                            'body' => $response->body(),
                        ],
                    ];
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Erreur CNEDDT dossier ' . $dossierId, ['error' => $e->getMessage()]);
                $results[] = [
                    'dossier_id' => $dossierId,
                    'result' => ['success' => false, 'message' => $e->getMessage()],
                ];
            }
        }

        return $results;
    }

    /**
     * Réponse CNEDDT type création permis : { "success": true, "code": 201, "message": "...", "data": { "cashier_short_code": "...", ... } }.
     * Si la clé "success" est absente, on considère le corps comme OK (compat anciennes réponses).
     *
     * @param  array<string, mixed>|null  $json
     */
    public static function cneddtResponseIndicatesSuccess(?array $json): bool
    {
        if ($json === null) {
            return false;
        }
        if (! array_key_exists('success', $json)) {
            return true;
        }

        $s = $json['success'];

        return $s === true || $s === 1 || $s === '1' || $s === 'true';
    }

    /**
     * Short code caisse / dossier dans la réponse CNEDDT (data.cashier_short_code), avec repli sur d’anciens noms.
     *
     * @param  array<string, mixed>|null  $json  Corps JSON complet de la réponse CNEDDT
     */
    public static function cneddtCashierShortCodeFromResponse(?array $json): string
    {
        if ($json === null) {
            return '';
        }
        $inner = $json['data'] ?? null;
        if (is_array($inner)) {
            foreach (['cashier_short_code', 'cashierShortCode', 'shortcode'] as $key) {
                if (! empty($inner[$key])) {
                    return (string) $inner[$key];
                }
            }
        }

        foreach (['cashier_short_code', 'shortcode'] as $key) {
            if (! empty($json[$key])) {
                return (string) $json[$key];
            }
        }

        return '';
    }

    /**
     * Reception d'un dossier à modifier depuis le CNEDDT.
     */
    public function receiveFromCneddt(array $payload, ?string $apiKey = null): array
    {
        $service = config('services.cneddt_api');

        if (!isset($service['key']) || empty($service['key'])) {
            Log::warning('Configuration CNEDDT API manquante pour la réception.');

            return [
                'success' => false,
                'message' => 'Configuration CNEDDT API manquante.',
                'skipped' => true,
            ];
        }

        //  Vérification API KEY
        if ($apiKey !== $service['key']) {
            Log::warning('Clé API invalide.', ['received_key' => $apiKey]);

            return [
                'success' => false,
                'message' => 'Clé API invalide.',
                'status' => 401,
            ];
        }

        try {
            if (!isset($payload['id_dossier']) || !Str::isUuid($payload['id_dossier'])) {
                return [
                    'success' => false,
                    'message' => 'ID invalide.',
                    'status' => 422,
                ];
            }

            $updated = Dossier::where('id', $payload['id_dossier'])
                ->update(['statut' => "RETOUR_CNEDDT_POUR_MODIFICATION"]);

            if (!$updated) {
                return [
                    'success' => false,
                    'message' => 'Dossier non trouvé.',
                    'status' => 404,
                ];
            }

            Log::info('Statut dossier mis à jour', [
                'id_dossier' => $payload['id_dossier'],
                'nouveau_statut' => "RETOUR_CNEDDT_POUR_MODIFICATION"
            ]);

            return [
                'success' => true,
                'message' => 'Dossier transféré avec succès.',
                'data' => [
                    'id_dossier' => $payload['id_dossier'],
                    'statut' => "RETOUR_CNEDDT_POUR_MODIFICATION"
                ]
            ];
        } catch (\Exception $e) {

            Log::error('Erreur réception CNEDDT', [
                'error' => $e->getMessage(),
                'payload' => $payload,
            ]);

            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }
}
