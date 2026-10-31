<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Client\Response;

class PaiementAirtelService
{
    protected string $apiKey;
    protected string $baseUrl;

    public function __construct()
    {
        $this->apiKey = (string) config('services.paynala.key');
        $this->baseUrl = (string) config('services.paynala.base_url');
    }

    /**
     * Recherche les détails d'un paiement par numéro d'identifiant (CNI, Passeport...)
     * * @param string $idNumber
     * @return array|null
     */
    public function lookupPayment(string $codePaiement): ?array
    {
        try {
            $response = Http::withHeaders([
                'x-api-key' => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post("{$this->baseUrl}/lookup-payment", [
                        'id_number' => $codePaiement,
                    ]);

            // Vérifie si la requête a réussi (200 OK)
            if ($response->successful()) {
                return $response->json();
            }

            // Log de l'erreur si la clé est invalide ou autre
            Log::warning("Paynala API Error: " . $response->body());
            return $response->json();

        } catch (\Exception $e) {
            Log::error("Paynala Connection Failed: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Erreur de connexion au service Paynala.'
            ];
        }
    }

    /**
     * Recherche les détails d'un paiement par numéro d'identifiant (CNI, Passeport...)
     * * @param string $idNumber
     * @return array|null
     */
    public function payementMock()
    {
        $resultat = [
            'success' => true,
            'merchant' => [
                'name' => 'Rengus Digital',
                'code' => 'RENGUS',
            ],
            'count' => 1,
            'data' => [
                'subscription' => [
                    'id' => 'uuid',
                    'external_ref' => 'REF-001',
                    'amount' => 50000,
                    'currency' => 'XAF',
                    'status' => 'ACTIVE',
                    'start_date' => '2025-01-01',
                    'created_at' => '2025-01-01T10:00:00Z',
                    'customer' => [
                        'first_name' => 'John',
                        'last_name' => 'Doe',
                        'email' => 'john@example.com',
                        'phone' => '237600000000',
                        'id_type' => 'PASSPORT',
                        'id_number' => 'AB123456',
                    ],
                ],
                'payments' => [
                    [
                        'id' => 'uuid',
                        'airtel_money_id' => 'MP251121.1358.D2303071234567890',
                        'amount' => 50000,
                        'base_amount' => 48500,
                        'charge_amount' => 1500,
                        'status' => 'SUCCESS',
                        'channel' => 'USSD',
                        'created_at' => '2025-01-15T10:30:00Z',
                        'completed_at' => '2025-01-15T10:31:00Z',
                    ],
                ],
            ],
        ];
        return $resultat;

    }
}