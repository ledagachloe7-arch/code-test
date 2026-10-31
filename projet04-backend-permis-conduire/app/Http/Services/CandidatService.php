<?php

namespace App\Http\Services;

use App\Models\Dossier;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class CandidatService
{

    public function dgdiCheckRequest(string $documentNumber)
    {
        $service = config('services.dgdi_api');

        if (!isset($service['url'])) {
            throw new \Exception("Url DGDI  manquante.");
        }

        $url = rtrim($service['url'], '/') . '//portal/api/v2/request-review';

        try {
            $response = Http::get($url, [
                'documentNumber' => $documentNumber
            ]);
            //dd($response);

            // Vérifier si la requête a réussi
            if ($response->successful()) {
                return $response->json();
            }

            // En cas d'erreur HTTP
            return [
                'success' => false,
                'status' => $response->status(),
                'body' => $response->body(),
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        };
    }

    public function generatePaymentCode($candidat): string
    {
        $time = now()->timestamp;

        $encodedTime = strtolower(base_convert((string) $time, 10, 36));
        // Sans préfixe fixe : garder assez de caractères pour limiter les collisions
        $encodedTime = substr($encodedTime, -8);

        $numeroPiece = (string) ($candidat?->numero_piece ?? '');
        $cleanNumeroPiece = preg_replace('/[^a-zA-Z0-9]/', '', $numeroPiece) ?? '';
        $lastTwo = strtolower(substr($cleanNumeroPiece, -2));
        if ($lastTwo === '') {
            $lastTwo = '00';
        }

        return $encodedTime . $lastTwo;
    }

    /** Code unique en base (`dossiers.code_paiement`), hors dossier `$exceptDossierId` si fourni. */
    public function generateUniquePaymentCode($candidat, ?string $exceptDossierId = null): string
    {
        $base = $this->generatePaymentCode($candidat);

        for ($attempt = 0; $attempt < 40; $attempt++) {
            $code = $attempt === 0
                ? $base
                : $base . strtolower(substr(str_replace('-', '', (string) Str::uuid()), 0, 6));

            $query = Dossier::query()->where('code_paiement', $code);
            if ($exceptDossierId !== null) {
                $query->where('id', '!=', $exceptDossierId);
            }
            if (! $query->exists()) {
                return $code;
            }
        }

        return strtolower(str_replace('-', '', (string) Str::uuid()));
    }
}
