<?php

namespace App\Services;

use App\Models\Paiement;
class PaiementHistoriqueService
{
    /**
     * Crée un nouvel enregistrement de paiement.
     *
     * @param array $data
     * @return Paiement
     */
    public function creerPaiement(array $data): Paiement
    {
        // Idempotent (Postgres friendly) : évite d'aborter une transaction sur contrainte unique.
        $unique = [
            'code_paiement' => $data['code_paiement'] ?? null,
            'reference_paiement' => $data['reference_paiement'] ?? null,
        ];
        if (empty($unique['code_paiement']) || empty($unique['reference_paiement'])) {
            throw new \Exception('code_paiement et reference_paiement sont requis pour créer un paiement.');
        }

        return Paiement::updateOrCreate($unique, [
            'dossier_id' => $data['dossier_id'] ?? null,
            'montant' => $data['montant'] ?? null,
            'nom' => $data['nom'] ?? null,
            'prenom' => $data['prenom'] ?? null,
        ]);
    }

    public function historiquePaiement(){
        return Paiement::all();
    }
}