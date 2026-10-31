<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

/**
 * Service d'envoi de SMS via Airtel Gabon ECP v6.0.0 ardeche comments
 * 
 * USAGE:
 * $smsService = new AirtelSmsService();
 * $result = $smsService->send('24177123456', 'Votre code est 1234');
 */
class AirtelSmsService
{
    /**
     * Configuration Airtel
     */
    private string $host;
    private string $username;
    private string $password;
    private string $senderId;

    /**
     * Constructeur - Initialise la configuration
     */
    public function __construct()
    {
        // Charger la configuration depuis config/services.php
        $this->host = config('services.airtel.host');
        $this->username = config('services.airtel.username');
        $this->password = config('services.airtel.password');
        $this->senderId = config('services.airtel.sender_id');
    }

    /**
     * Envoyer un SMS
     *
     * @param string $phoneNumber  Numéro de téléphone (ex: 24177123456)
     * @param string $message      Message à envoyer (max 160 caractères recommandé)
     * @return bool                true si succès, false si échec
     */
    public function send(string $phoneNumber, string $message): bool
    {
        return $this->sendWithDiagnostics($phoneNumber, $message)['success'];
    }

    /**
     * Même envoi que {@see send()} avec le détail utile pour l’API / le front.
     *
     * @return array{success: bool, reason?: string, sanitized_phone?: string, airtel_response?: string, error?: string}
     */
    public function sendWithDiagnostics(string $phoneNumber, string $message): array
    {
        try {
            $input = $phoneNumber;
            $phoneNumber = $this->sanitizePhoneNumber($phoneNumber);

            if (! $this->isValidGabonNumber($phoneNumber)) {
                Log::error('[AirtelSMS] Numéro de téléphone invalide', [
                    'phone_sanitized' => $phoneNumber,
                    'phone_input' => $input,
                ]);

                return [
                    'success' => false,
                    'reason' => 'invalid_gabon_phone',
                    'sanitized_phone' => $phoneNumber,
                ];
            }

            if (strlen($message) > 160) {
                $message = substr($message, 0, 157) . '...';
            }

            $params = [
                'REQUESTTYPE' => 'SMSSubmitReq',
                'USERNAME'    => $this->username,
                'PASSWORD'    => $this->password,
                'MOBILENO'    => $phoneNumber,
                'MESSAGE'     => $message,
                'ORIGIN_ADDR' => $this->senderId,
                'TYPE'        => '0',
            ];

            $url = $this->host . '?' . http_build_query($params);
            $response = $this->sendCurlRequest($url);

            if ($this->isSuccessResponse($response)) {
                Log::info('[AirtelSMS] SMS envoyé avec succès', [
                    'phone' => $phoneNumber,
                    'message_length' => strlen($message),
                    'response' => $response,
                ]);

                return ['success' => true, 'sanitized_phone' => $phoneNumber];
            }

            Log::error('[AirtelSMS] Échec d\'envoi SMS', [
                'phone' => $phoneNumber,
                'response' => $response,
            ]);

            return [
                'success' => false,
                'reason' => 'airtel_not_accepted',
                'sanitized_phone' => $phoneNumber,
                'airtel_response' => substr((string) $response, 0, 500),
            ];
        } catch (\Throwable $e) {
            Log::error('[AirtelSMS] Erreur lors de l\'envoi du SMS', [
                'phone' => $phoneNumber ?? 'N/A',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'reason' => 'transport_error',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Nettoyer le numéro de téléphone
     * Supprime espaces, tirets, etc.
     * 
     * @param string $phoneNumber
     * @return string
     */
    private function sanitizePhoneNumber(string $phoneNumber): string
    {
        // Supprimer tous les caractères non-numériques
        $phone = preg_replace('/[^0-9]/', '', $phoneNumber);

        // Si le numéro commence par 0, le remplacer par 241 (indicatif Gabon)
        if (substr($phone, 0, 1) === '0') {
            $phone = '241' . substr($phone, 1);
        }

        // Si le numéro ne commence pas par 241, l'ajouter
        if (substr($phone, 0, 3) !== '241') {
            $phone = '241' . $phone;
        }

        return $phone;
    }

    /**
     * Valider un numéro gabonais
     * 
     * @param string $phoneNumber
     * @return bool
     */
    private function isValidGabonNumber(string $phoneNumber): bool
    {
        // Un numéro gabonais valide :
        // - Commence par 241 (indicatif pays)
        // - Suivi de 2 chiffres pour l'opérateur (06, 07, 01, 02, 04, 05)
        // - Puis 6 chiffres
        // Total : 11 chiffres (241 + 2 + 6)

        $pattern = '/^241(0[1-7]|[1-9][0-9])\d{6}$/';
        return preg_match($pattern, $phoneNumber) === 1;
    }

    /**
     * Envoyer la requête cURL
     * 
     * @param string $url
     * @return string
     */
    private function sendCurlRequest(string $url): string
    {
        $ch = curl_init();

        curl_setopt_array($ch, [
            CURLOPT_URL            => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 10,
            // ⚠️ CRITIQUE : Désactiver la vérification SSL
            // (certificat auto-signé d'Airtel)
            CURLOPT_SSL_VERIFYHOST => 0,
            CURLOPT_SSL_VERIFYPEER => 0,
        ]);

        $response = curl_exec($ch);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new \Exception('Erreur cURL: ' . $error);
        }

        return $response;
    }

    /**
     * Vérifier si la réponse indique un succès
     * 
     * @param string $response
     * @return bool
     */
    private function isSuccessResponse(string $response): bool
    {
        // Airtel renvoie "+OK" en cas de succès
        // Exemple : +OK 8248428906433229997|Accepted|20260114-122937
        return strpos($response, '+OK') !== false;
    }
}
