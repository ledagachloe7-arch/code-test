<?php

namespace Database\Seeders;

use App\Models\Document;
use App\Models\Dossier;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DocumentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::transaction(function () {
            // Récupérer les dossiers
            $dossiers = Dossier::with(['candidat.personne', 'autoEcole'])->get();
            if ($dossiers->isEmpty()) {
                $this->command->warn('⚠️ Aucun dossier trouvé. Exécutez d\'abord DossierSeeder.');
                return;
            }

            $statutsValidation = [true, false]; // valide ou non
            $typesMime = [
                'application/pdf',
                'image/jpeg',
                'image/png',
                'image/jpg'
            ];

            $createdCount = 0;

            foreach ($dossiers as $dossier) {
                // Chaque dossier aura entre 2 et 5 documents
                $nombreDocuments = rand(2, 5);
                
                for ($i = 0; $i < $nombreDocuments; $i++) {
                    try {
                        // Générer un nom de fichier réaliste
                        $typesDoc = ['CNI', 'PASSEPORT', 'PHOTO_IDENTITE', 'JUSTIFICATIF_DOMICILE', 'CERTIFICAT_MEDICAL', 'RIB'];
                        $typeDocAleatoire = $typesDoc[array_rand($typesDoc)];
                        $nomFichier = $this->generateFileName($typeDocAleatoire, $dossier->candidat->personne);
                        $cheminFichier = "documents/{$nomFichier}";
                        
                        // Générer des métadonnées
                        $typeMime = $typesMime[array_rand($typesMime)];
                        $tailleFichier = rand(50000, 2000000); // Entre 50KB et 2MB
                        $valide = $statutsValidation[array_rand($statutsValidation)];
                        
                        // Générer des commentaires
                        $commentaires = $this->generateComments($typeDocAleatoire, $valide);

                        // Créer le document via la relation polymorphique (automatique)
                        $dossier->documents()->create([
                            'nom_fichier' => $nomFichier,
                            'chemin_fichier' => $cheminFichier,
                            'type_mime' => $typeMime,
                            'taille_fichier' => $tailleFichier,
                            'valide' => $valide,
                            'commentaires' => $commentaires,
                        ]);

                        $createdCount++;
                        $statutValide = $valide ? '✅ Valide' : '❌ Non valide';
                        $this->command->info("✅ Document créé : {$nomFichier} - {$statutValide}");

                    } catch (\Exception $e) {
                        $this->command->error("❌ Erreur création document pour dossier {$dossier->id}: " . $e->getMessage());
                    }
                }
            }

            $this->command->info("🎉 Documents créés : {$createdCount}");
        });
    }

    /**
     * Générer un nom de fichier réaliste
     */
    private function generateFileName(string $typeDocument, $personne): string
    {
        $timestamp = now()->format('Ymd_His');
        $nom = strtolower($personne->nom);
        $prenom = strtolower($personne->prenom);
        
        switch ($typeDocument) {
            case 'CNI':
                return "cni_{$nom}_{$prenom}_{$timestamp}.pdf";
            case 'PASSEPORT':
                return "passeport_{$nom}_{$prenom}_{$timestamp}.pdf";
            case 'PHOTO_IDENTITE':
                return "photo_{$nom}_{$prenom}_{$timestamp}.jpg";
            case 'JUSTIFICATIF_DOMICILE':
                return "domicile_{$nom}_{$prenom}_{$timestamp}.pdf";
            case 'CERTIFICAT_MEDICAL':
                return "medical_{$nom}_{$prenom}_{$timestamp}.pdf";
            case 'ATTESTATION_SCOLAIRE':
                return "scolaire_{$nom}_{$prenom}_{$timestamp}.pdf";
            case 'RIB':
                return "rib_{$nom}_{$prenom}_{$timestamp}.pdf";
            case 'QUITTANCE_PAIEMENT':
                return "paiement_{$nom}_{$prenom}_{$timestamp}.pdf";
            case 'CONTRAT_FORMATION':
                return "contrat_{$nom}_{$prenom}_{$timestamp}.pdf";
            default:
                return "document_{$nom}_{$prenom}_{$timestamp}.pdf";
        }
    }

    /**
     * Générer des commentaires selon le type de document et le statut
     */
    private function generateComments(string $typeDocument, bool $valide): ?string
    {
        if ($valide) {
            $commentairesValides = [
                'Document conforme, validation OK',
                'Document valide et lisible',
                'Toutes les informations sont correctes',
                'Document accepté sans réserve',
                'Validation réussie'
            ];
            return $commentairesValides[array_rand($commentairesValides)];
        } else {
            $commentairesNonValides = [
                'Document illisible, veuillez renvoyer',
                'Informations manquantes',
                'Document expiré',
                'Qualité insuffisante',
                'Format non accepté',
                'Document incomplet'
            ];
            return $commentairesNonValides[array_rand($commentairesNonValides)];
        }
    }
}