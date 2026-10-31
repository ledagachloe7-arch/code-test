<?php

namespace Database\Seeders;

use App\Models\PieceJustificative;
use App\Models\Referentiel;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PieceJustificativeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        /*DB::transaction(function () {
            // Récupérer les référentiels nécessaires
            $typesDocuments = Referentiel::where('type_ref', 'type_document')->get();
            $typesPermis = Referentiel::where('type_ref', 'type_permis')->get();
            $inscriptions = Referentiel::where('type_ref', 'inscription')->get();

            if ($typesDocuments->isEmpty() || $typesPermis->isEmpty()) {
                $this->command->warn('⚠️ Référentiels manquants. Exécutez d\'abord ReferentielSeeder.');
                return;
            }

            // Créer des référentiels d'inscription s'ils n'existent pas
            if ($inscriptions->isEmpty()) {
                $inscriptions = collect([
                    Referentiel::create([
                        'libelle' => 'Première inscription',
                        'code' => 'PREMIERE_INSCRIPTION',
                        'type_ref' => 'inscription',
                        'description' => 'Première inscription au permis'
                    ]),
                    Referentiel::create([
                        'libelle' => 'Renouvellement',
                        'code' => 'RENOUVELLEMENT',
                        'type_ref' => 'inscription',
                        'description' => 'Renouvellement de permis'
                    ]),
                    Referentiel::create([
                        'libelle' => 'Changement de catégorie',
                        'code' => 'CHANGEMENT_CATEGORIE',
                        'type_ref' => 'inscription',
                        'description' => 'Changement de catégorie de permis'
                    ])
                ]);
            }

            $piecesJustificatives = [
                // Pièces pour Permis B - Première inscription
                [
                    'type_document_code' => 'CNI_DOC',
                    'type_permis_code' => 'B',
                    'is_national' => true,
                    'obligatoire' => true,
                    'inscription_code' => 'PREMIERE_INSCRIPTION'
                ],
                [
                    'type_document_code' => 'PHOTO_IDENTITE',
                    'type_permis_code' => 'B',
                    'is_national' => true,
                    'obligatoire' => true,
                    'inscription_code' => 'PREMIERE_INSCRIPTION'
                ],
                [
                    'type_document_code' => 'JUSTIFICATIF_DOMICILE',
                    'type_permis_code' => 'B',
                    'is_national' => true,
                    'obligatoire' => true,
                    'inscription_code' => 'PREMIERE_INSCRIPTION'
                ],
                [
                    'type_document_code' => 'CERTIFICAT_MEDICAL',
                    'type_permis_code' => 'B',
                    'is_national' => true,
                    'obligatoire' => true,
                    'inscription_code' => 'PREMIERE_INSCRIPTION'
                ],
                [
                    'type_document_code' => 'ATTESTATION_SCOLAIRE',
                    'type_permis_code' => 'B',
                    'is_national' => true,
                    'obligatoire' => false,
                    'inscription_code' => 'PREMIERE_INSCRIPTION'
                ],
                [
                    'type_document_code' => 'RIB',
                    'type_permis_code' => 'B',
                    'is_national' => true,
                    'obligatoire' => true,
                    'inscription_code' => 'PREMIERE_INSCRIPTION'
                ],

                // Pièces pour Permis A - Première inscription
                [
                    'type_document_code' => 'CNI_DOC',
                    'type_permis_code' => 'A',
                    'is_national' => true,
                    'obligatoire' => true,
                    'inscription_code' => 'PREMIERE_INSCRIPTION'
                ],
                [
                    'type_document_code' => 'PHOTO_IDENTITE',
                    'type_permis_code' => 'A',
                    'is_national' => true,
                    'obligatoire' => true,
                    'inscription_code' => 'PREMIERE_INSCRIPTION'
                ],
                [
                    'type_document_code' => 'JUSTIFICATIF_DOMICILE',
                    'type_permis_code' => 'A',
                    'is_national' => true,
                    'obligatoire' => true,
                    'inscription_code' => 'PREMIERE_INSCRIPTION'
                ],
                [
                    'type_document_code' => 'CERTIFICAT_MEDICAL',
                    'type_permis_code' => 'A',
                    'is_national' => true,
                    'obligatoire' => true,
                    'inscription_code' => 'PREMIERE_INSCRIPTION'
                ],

                // Pièces pour Permis A2 - Première inscription
                [
                    'type_document_code' => 'CNI_DOC',
                    'type_permis_code' => 'A2',
                    'is_national' => true,
                    'obligatoire' => true,
                    'inscription_code' => 'PREMIERE_INSCRIPTION'
                ],
                [
                    'type_document_code' => 'PHOTO_IDENTITE',
                    'type_permis_code' => 'A2',
                    'is_national' => true,
                    'obligatoire' => true,
                    'inscription_code' => 'PREMIERE_INSCRIPTION'
                ],
                [
                    'type_document_code' => 'CERTIFICAT_MEDICAL',
                    'type_permis_code' => 'A2',
                    'is_national' => true,
                    'obligatoire' => true,
                    'inscription_code' => 'PREMIERE_INSCRIPTION'
                ],

                // Pièces pour Permis A1 - Première inscription
                [
                    'type_document_code' => 'CNI_DOC',
                    'type_permis_code' => 'A1',
                    'is_national' => true,
                    'obligatoire' => true,
                    'inscription_code' => 'PREMIERE_INSCRIPTION'
                ],
                [
                    'type_document_code' => 'PHOTO_IDENTITE',
                    'type_permis_code' => 'A1',
                    'is_national' => true,
                    'obligatoire' => true,
                    'inscription_code' => 'PREMIERE_INSCRIPTION'
                ],

                // Pièces pour Permis BE - Première inscription
                [
                    'type_document_code' => 'CNI_DOC',
                    'type_permis_code' => 'BE',
                    'is_national' => true,
                    'obligatoire' => true,
                    'inscription_code' => 'PREMIERE_INSCRIPTION'
                ],
                [
                    'type_document_code' => 'PHOTO_IDENTITE',
                    'type_permis_code' => 'BE',
                    'is_national' => true,
                    'obligatoire' => true,
                    'inscription_code' => 'PREMIERE_INSCRIPTION'
                ],
                [
                    'type_document_code' => 'CERTIFICAT_MEDICAL',
                    'type_permis_code' => 'BE',
                    'is_national' => true,
                    'obligatoire' => true,
                    'inscription_code' => 'PREMIERE_INSCRIPTION'
                ],

                // Pièces pour Permis C - Première inscription
                [
                    'type_document_code' => 'CNI_DOC',
                    'type_permis_code' => 'C',
                    'is_national' => true,
                    'obligatoire' => true,
                    'inscription_code' => 'PREMIERE_INSCRIPTION'
                ],
                [
                    'type_document_code' => 'PHOTO_IDENTITE',
                    'type_permis_code' => 'C',
                    'is_national' => true,
                    'obligatoire' => true,
                    'inscription_code' => 'PREMIERE_INSCRIPTION'
                ],
                [
                    'type_document_code' => 'CERTIFICAT_MEDICAL',
                    'type_permis_code' => 'C',
                    'is_national' => true,
                    'obligatoire' => true,
                    'inscription_code' => 'PREMIERE_INSCRIPTION'
                ],
                [
                    'type_document_code' => 'JUSTIFICATIF_DOMICILE',
                    'type_permis_code' => 'C',
                    'is_national' => true,
                    'obligatoire' => true,
                    'inscription_code' => 'PREMIERE_INSCRIPTION'
                ],

                // Pièces pour Permis D - Première inscription
                [
                    'type_document_code' => 'CNI_DOC',
                    'type_permis_code' => 'D',
                    'is_national' => true,
                    'obligatoire' => true,
                    'inscription_code' => 'PREMIERE_INSCRIPTION'
                ],
                [
                    'type_document_code' => 'PHOTO_IDENTITE',
                    'type_permis_code' => 'D',
                    'is_national' => true,
                    'obligatoire' => true,
                    'inscription_code' => 'PREMIERE_INSCRIPTION'
                ],
                [
                    'type_document_code' => 'CERTIFICAT_MEDICAL',
                    'type_permis_code' => 'D',
                    'is_national' => true,
                    'obligatoire' => true,
                    'inscription_code' => 'PREMIERE_INSCRIPTION'
                ],
                [
                    'type_document_code' => 'JUSTIFICATIF_DOMICILE',
                    'type_permis_code' => 'D',
                    'is_national' => true,
                    'obligatoire' => true,
                    'inscription_code' => 'PREMIERE_INSCRIPTION'
                ],

                // Pièces pour étrangers - Permis B
                [
                    'type_document_code' => 'PASSEPORT_DOC',
                    'type_permis_code' => 'B',
                    'is_national' => false,
                    'obligatoire' => true,
                    'inscription_code' => 'PREMIERE_INSCRIPTION'
                ],
                [
                    'type_document_code' => 'PERMIS_SEJOUR',
                    'type_permis_code' => 'B',
                    'is_national' => false,
                    'obligatoire' => true,
                    'inscription_code' => 'PREMIERE_INSCRIPTION'
                ],

                // Pièces pour renouvellement - Permis B
                [
                    'type_document_code' => 'CNI_DOC',
                    'type_permis_code' => 'B',
                    'is_national' => true,
                    'obligatoire' => true,
                    'inscription_code' => 'RENOUVELLEMENT'
                ],
                [
                    'type_document_code' => 'PHOTO_IDENTITE',
                    'type_permis_code' => 'B',
                    'is_national' => true,
                    'obligatoire' => true,
                    'inscription_code' => 'RENOUVELLEMENT'
                ],
                [
                    'type_document_code' => 'CERTIFICAT_MEDICAL',
                    'type_permis_code' => 'B',
                    'is_national' => true,
                    'obligatoire' => true,
                    'inscription_code' => 'RENOUVELLEMENT'
                ]
            ];

            $createdCount = 0;

            foreach ($piecesJustificatives as $pieceData) {
                try {
                    // Trouver le type de document
                    $typeDocument = $typesDocuments->where('code', $pieceData['type_document_code'])->first();
                    if (!$typeDocument) {
                        $this->command->warn("⚠️ Type de document {$pieceData['type_document_code']} non trouvé");
                        continue;
                    }

                    // Trouver le type de permis
                    $typePermis = $typesPermis->where('code', $pieceData['type_permis_code'])->first();
                    if (!$typePermis) {
                        $this->command->warn("⚠️ Type de permis {$pieceData['type_permis_code']} non trouvé");
                        continue;
                    }

                    // Trouver le type d'inscription
                    $inscription = $inscriptions->where('code', $pieceData['inscription_code'])->first();
                    if (!$inscription) {
                        $this->command->warn("⚠️ Type d'inscription {$pieceData['inscription_code']} non trouvé");
                        continue;
                    }

                    // Vérifier si la pièce justificative existe déjà
                    $existingPiece = PieceJustificative::where('type_document_id', $typeDocument->id)
                        ->where('type_permis_id', $typePermis->id)
                        ->where('inscription_id', $inscription->id)
                        ->first();

                    if ($existingPiece) {
                        $this->command->warn("⚠️ Pièce justificative existe déjà : {$pieceData['type_document_code']} - {$pieceData['type_permis_code']} - {$pieceData['inscription_code']}");
                        continue;
                    }

                    // Créer la pièce justificative
                    PieceJustificative::create([
                        'type_document_id' => $typeDocument->id,
                        'type_permis_id' => $typePermis->id,
                        'is_national' => $pieceData['is_national'],
                        'obligatoire' => $pieceData['obligatoire'],
                        'inscription_id' => $inscription->id,
                    ]);

                    $createdCount++;
                    $this->command->info("✅ Pièce justificative créée : {$pieceData['type_document_code']} - {$pieceData['type_permis_code']} - {$pieceData['inscription_code']}");

                } catch (\Exception $e) {
                    $this->command->error("❌ Erreur création pièce justificative {$pieceData['type_document_code']}: " . $e->getMessage());
                }
            }

            $this->command->info("🎉 Pièces justificatives créées : {$createdCount}");
        });*/
    }
}