<?php

namespace Database\Seeders;

use App\Models\Status;
use Illuminate\Database\Seeder;

class StatusSeeder extends Seeder
{
    /**
     * Remplit la table status avec les codes et libellés du parcours permis.
     * final et annulable sont à false (sauf si vous les modifiez manuellement en base).
     */
    public function run(): void
    {
        $statuses = [
            ['code' => 'SOUMIS', 'libelle' => 'Transmission'],
            ['code' => 'EN_ATTENTE_PIECES', 'libelle' => 'Vérification des pièces'],
            ['code' => 'DOSSIER_COMPLET', 'libelle' => 'Dossier prêt à instruire'],
            ['code' => 'VALIDE', 'libelle' => 'Validation du dossier'],
            ['code' => 'EN_ATTENTE_PAIEMENT', 'libelle' => 'Attente règlement'],
            ['code' => 'PAYE', 'libelle' => 'Paiement confirmé'],
            ['code' => 'AFFECTE_BIOMETRIE', 'libelle' => 'Orientation centre biométrique'],
            ['code' => 'BIOMETRIE_EFFECTUEE', 'libelle' => 'Capture biométrique réalisée'],
            ['code' => 'EN_FILE_IMPRESSION', 'libelle' => 'File d\'attente production'],
            ['code' => 'IMPRIME', 'libelle' => 'Permis produit'],
            ['code' => 'RETIRE', 'libelle' => 'Permis remis'],
            ['code' => 'CARTE_DISPONIBLE_AU_CENTRE', 'libelle' => 'Carte disponible au centre (dossiers.statut)'],
            ['code' => 'CARTE_REMIS_AU_CANDIDAT', 'libelle' => 'Carte remise au candidat (dossiers.statut)'],
            ['code' => 'REJETE', 'libelle' => 'Rejeté'],
            ['code' => 'SUSPENDU', 'libelle' => 'Suspendu'],
            ['code' => 'ANNULE', 'libelle' => 'Annulé'],
            ['code' => 'EXPIRE', 'libelle' => 'Expiré'],
            ['code' => 'ARCHIVE', 'libelle' => 'Archivé'],
        ];

        foreach ($statuses as $item) {
            Status::updateOrCreate(
                ['code' => $item['code']],
                [
                    'libelle' => $item['libelle'],
                    'final' => false,
                    'annulable' => false,
                ]
            );
        }
    }
}
