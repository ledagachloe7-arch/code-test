<?php

namespace Database\Seeders;

use App\Models\Referentiel;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ReferentielSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::transaction(function () {
            // Types de permis (code court : B, A, C, …)
            $typesPermis = [
                ['libelle' => 'Permis B', 'code' => 'B', 'type_ref' => 'type_permis', 'description' => 'Permis de conduire voiture'],
                ['libelle' => 'Permis A', 'code' => 'A', 'type_ref' => 'type_permis', 'description' => 'Permis de conduire moto'],
                ['libelle' => 'Permis C', 'code' => 'C', 'type_ref' => 'type_permis', 'description' => 'Permis de conduire poids lourd'],
                ['libelle' => 'Permis D', 'code' => 'D', 'type_ref' => 'type_permis', 'description' => 'Permis de conduire transport en commun'],
                ['libelle' => 'Permis BE', 'code' => 'BE', 'type_ref' => 'type_permis', 'description' => 'Permis B + remorque'],
                ['libelle' => 'Permis A2', 'code' => 'A2', 'type_ref' => 'type_permis', 'description' => 'Permis moto 35kW'],
                ['libelle' => 'Permis A1', 'code' => 'A1', 'type_ref' => 'type_permis', 'description' => 'Permis moto 125cm³'],
            ];

            // Sessions de formation
            $sessions = [
                ['libelle' => 'Session Matin', 'code' => 'SESSION_MATIN', 'type_ref' => 'session', 'description' => 'Formation le matin de 8h à 12h'],
                ['libelle' => 'Session Après-midi', 'code' => 'SESSION_APRES_MIDI', 'type_ref' => 'session', 'description' => 'Formation l\'après-midi de 14h à 18h'],
                ['libelle' => 'Session Soir', 'code' => 'SESSION_SOIR', 'type_ref' => 'session', 'description' => 'Formation le soir de 18h à 22h'],
                ['libelle' => 'Session Week-end', 'code' => 'SESSION_WEEKEND', 'type_ref' => 'session', 'description' => 'Formation le week-end'],
                ['libelle' => 'Session Intensive', 'code' => 'SESSION_INTENSIVE', 'type_ref' => 'session', 'description' => 'Formation intensive sur plusieurs jours'],
                ['libelle' => 'Session Accélérée', 'code' => 'SESSION_ACCELEREE', 'type_ref' => 'session', 'description' => 'Formation accélérée'],
            ];

            // Types de documents
            $typesDocuments = [
                ['libelle' => 'Carte Nationale d\'Identité', 'code' => 'CNI', 'type_ref' => 'type_document', 'description' => 'Pièce d\'identité française'],
                ['libelle' => 'Passeport', 'code' => 'PASSEPORT', 'type_ref' => 'type_document', 'description' => 'Passeport français ou étranger'],
                ['libelle' => 'Permis de Séjour', 'code' => 'PERMIS_SEJOUR', 'type_ref' => 'type_document', 'description' => 'Permis de séjour pour étrangers'],
                ['libelle' => 'Photo d\'identité', 'code' => 'PHOTO_IDENTITE', 'type_ref' => 'type_document', 'description' => 'Photo d\'identité récente'],
                ['libelle' => 'Justificatif de domicile', 'code' => 'JUSTIFICATIF_DOMICILE', 'type_ref' => 'type_document', 'description' => 'Facture ou quittance de loyer'],
                ['libelle' => 'Certificat médical', 'code' => 'CERTIFICAT_MEDICAL', 'type_ref' => 'type_document', 'description' => 'Certificat médical d\'aptitude'],
                ['libelle' => 'Attestation scolaire', 'code' => 'ATTESTATION_SCOLAIRE', 'type_ref' => 'type_document', 'description' => 'Attestation de scolarité'],
                ['libelle' => 'Relevé d\'identité bancaire', 'code' => 'RIB', 'type_ref' => 'type_document', 'description' => 'Relevé d\'identité bancaire'],
                ['libelle' => 'Quittance de paiement', 'code' => 'QUITTANCE_PAIEMENT', 'type_ref' => 'type_document', 'description' => 'Quittance de paiement des frais'],
                ['libelle' => 'Contrat de formation', 'code' => 'CONTRAT_FORMATION', 'type_ref' => 'type_document', 'description' => 'Contrat de formation signé'],
            ];

            // Statuts de dossier
            $statutsDossier = [
                ['libelle' => 'En attente', 'code' => 'EN_ATTENTE', 'type_ref' => 'statut_dossier', 'description' => 'Dossier en attente de traitement'],
                ['libelle' => 'En cours', 'code' => 'EN_COURS', 'type_ref' => 'statut_dossier', 'description' => 'Dossier en cours de traitement'],
                ['libelle' => 'Validé', 'code' => 'VALIDE', 'type_ref' => 'statut_dossier', 'description' => 'Dossier validé'],
                ['libelle' => 'Rejeté', 'code' => 'REJETE', 'type_ref' => 'statut_dossier', 'description' => 'Dossier rejeté'],
            ];

            // Types de pièces d'identité
            $typesPiece = [
                ['libelle' => 'Carte Nationale d\'Identité', 'code' => 'CNI', 'type_ref' => 'type_piece', 'description' => 'CNI française'],
                ['libelle' => 'Passeport', 'code' => 'PASSEPORT', 'type_ref' => 'type_piece', 'description' => 'Passeport français'],
                ['libelle' => 'Passeport étranger', 'code' => 'PASSEPORT_ETRANGER', 'type_ref' => 'type_piece', 'description' => 'Passeport étranger'],
                ['libelle' => 'Permis de conduire étranger', 'code' => 'PERMIS_ETRANGER', 'type_ref' => 'type_piece', 'description' => 'Permis de conduire étranger'],
            ];

            // Types d'inscription
            $typesInscription = [
                ['libelle' => 'Première inscription', 'code' => 'PREMIERE_INSCRIPTION', 'type_ref' => 'inscription', 'description' => 'Première inscription au permis'],
                ['libelle' => 'Renouvellement', 'code' => 'RENOUVELLEMENT', 'type_ref' => 'inscription', 'description' => 'Renouvellement de permis'],
                ['libelle' => 'Changement de catégorie', 'code' => 'CHANGEMENT_CATEGORIE', 'type_ref' => 'inscription', 'description' => 'Changement de catégorie de permis'],
            ];

            // Nationalités
            $nationalites = [
                ['libelle' => 'Française', 'code' => 'FRANCAISE', 'type_ref' => 'nationalite', 'description' => 'Nationalité française'],
                ['libelle' => 'Algérienne', 'code' => 'ALGERIENNE', 'type_ref' => 'nationalite', 'description' => 'Nationalité algérienne'],
                ['libelle' => 'Marocaine', 'code' => 'MAROCAINE', 'type_ref' => 'nationalite', 'description' => 'Nationalité marocaine'],
                ['libelle' => 'Tunisienne', 'code' => 'TUNISIENNE', 'type_ref' => 'nationalite', 'description' => 'Nationalité tunisienne'],
                ['libelle' => 'Sénégalaise', 'code' => 'SENEGALAISE', 'type_ref' => 'nationalite', 'description' => 'Nationalité sénégalaise'],
                ['libelle' => 'Malgache', 'code' => 'MALGACHE', 'type_ref' => 'nationalite', 'description' => 'Nationalité malgache'],
                ['libelle' => 'Camerounaise', 'code' => 'CAMEROUNAISE', 'type_ref' => 'nationalite', 'description' => 'Nationalité camerounaise'],
                ['libelle' => 'Ivoirienne', 'code' => 'IVOIRIENNE', 'type_ref' => 'nationalite', 'description' => 'Nationalité ivoirienne'],
                ['libelle' => 'Autre', 'code' => 'AUTRE', 'type_ref' => 'nationalite', 'description' => 'Autre nationalité'],
            ];

            // Nationalités
            $provinces = [
                ['libelle' => 'Estuaire', 'code' => 'G1', 'type_ref' => 'province', 'description' => 'L’Estuaire est une province du Gabon, située dans la partie nord-ouest du pays. Elle est bordée par l’océan Atlantique et traversée par l’estuaire du Komo, auquel elle doit son nom'],
                ['libelle' => 'Haut-Ogooue', 'code' => 'G2', 'type_ref' => 'province', 'description' => 'Elle est la deuxième province la plus peuplée du pays après l’Estuaire. Son chef-lieu est Franceville et Moanda est sa principale ville économique (la principale ville minière)'],
                ['libelle' => 'Moyen-Ogooue', 'code' => 'G3', 'type_ref' => 'province', 'description' => 'Le Moyen-Ogooué est une des neuf provinces du Gabon.'],
                ['libelle' => 'Ngounie', 'code' => 'G4', 'type_ref' => 'province', 'description' => 'La Ngounié est une province du Gabon située dans la partie sud du pays. Elle couvre une superficie de 37 750 km², soit environ 14,1 % du territoire national, ce qui en fait la deuxième province du Gabon par la taille'],
                ['libelle' => 'Nyanga', 'code' => 'G5', 'type_ref' => 'province', 'description' => 'La Nyanga est une province du Gabon située dans la partie sud-ouest du pays. Elle couvre une superficie de 21 285 km², soit environ 7,95 % du territoire national, ce qui en fait la septième province du Gabon par la taille.'],
                ['libelle' => 'Ogooue-Ivindo', 'code' => 'G6', 'type_ref' => 'province', 'description' => 'L’Ogooué-Ivindo est une province du Gabon située dans la partie nord-est du pays, frontalière au Congo.Elle couvre une superficie de ~46 075 km² (la plus vaste du Gabon) et présente la densité de population la plus faible parmi les provinces du pays'],
                ['libelle' => 'Ogooue-Lolo', 'code' => 'G7', 'type_ref' => 'province', 'description' => 'L’Ogooué-Lolo est une province du Gabon, située dans la partie centre-est du pays. Elle doit son nom aux deux principaux cours d’eau qui la traversent, l’Ogooué et la Lolo.'],
                ['libelle' => 'Ogooue-Maritime', 'code' => 'G8', 'type_ref' => 'province', 'description' => 'L’Ogooué-Maritime est une province du Gabon, située dans la partie ouest du pays, la province est baignée par le golfe de Guinée.'],
                ['libelle' => 'Woleu-Ntem', 'code' => 'G9', 'type_ref' => 'province', 'description' => 'Le Woleu-Ntem est une province du Gabon, située dans la partie nord du pays. Elle est frontalière du Cameroun, de la Guinée équatoriale et du Congo.'],
            ];

            // Combiner tous les référentiels
            $referentiels = array_merge(
                $typesPermis,
                $sessions,
                $typesDocuments,
                $statutsDossier,
                $typesPiece,
                $typesInscription,
                $nationalites,
                $provinces
            );

            foreach ($referentiels as $referentiel) {
                Referentiel::updateOrCreate(
                    ['code' => $referentiel['code']],
                    $referentiel
                );
            }

            $this->command->info('✅ Référentiels créés avec succès : ' . count($referentiels) . ' entrées');
        });
    }
}