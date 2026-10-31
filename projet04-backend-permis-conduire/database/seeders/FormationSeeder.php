<?php

namespace Database\Seeders;

use App\Models\FormationAutoEcole;
use App\Models\AutoEcole;
use App\Models\Referentiel;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class FormationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::transaction(function () {
            // Récupérer les auto-écoles
            $autoEcoles = AutoEcole::all();
            if ($autoEcoles->isEmpty()) {
                $this->command->warn('⚠️ Aucune auto-école trouvée. Exécutez d\'abord AutoEcoleSeeder.');
                return;
            }

            // Récupérer les référentiels
            $typesPermis = Referentiel::where('type_ref', 'type_permis')->get();
            $sessions = Referentiel::where('type_ref', 'session')->get();

            if ($typesPermis->isEmpty() || $sessions->isEmpty()) {
                $this->command->warn('⚠️ Référentiels manquants. Exécutez d\'abord ReferentielSeeder.');
                return;
            }

            $formationsData = [
                // Formations Permis B
                [
                    'nom' => 'Formation Permis B Standard',
                    'description' => 'Formation classique pour l\'obtention du permis B',
                    'montant' => 1000.00,
                    'type_permis_code' => 'B',
                    'session_code' => 'SESSION_MATIN'
                ],
                [
                    'nom' => 'Formation Permis B Accélérée',
                    'description' => 'Formation intensive pour l\'obtention du permis B',
                    'montant' => 1500.00,
                    'type_permis_code' => 'B',
                    'session_code' => 'SESSION_INTENSIVE'
                ],
                [
                    'nom' => 'Formation Permis B Soir',
                    'description' => 'Formation en soirée pour l\'obtention du permis B',
                    'montant' => 1200.00,
                    'type_permis_code' => 'B',
                    'session_code' => 'SESSION_SOIR'
                ],
                [
                    'nom' => 'Formation Permis B Week-end',
                    'description' => 'Formation le week-end pour l\'obtention du permis B',
                    'montant' => 1300.00,
                    'type_permis_code' => 'B',
                    'session_code' => 'SESSION_WEEKEND'
                ],
                [
                    'nom' => 'Formation Permis B Après-midi',
                    'description' => 'Formation l\'après-midi pour l\'obtention du permis B',
                    'montant' => 1100.00,
                    'type_permis_code' => 'B',
                    'session_code' => 'SESSION_APRES_MIDI'
                ],

                // Formations Permis A
                [
                    'nom' => 'Formation Permis A Standard',
                    'description' => 'Formation classique pour l\'obtention du permis A',
                    'montant' => 800.00,
                    'type_permis_code' => 'A',
                    'session_code' => 'SESSION_MATIN'
                ],
                [
                    'nom' => 'Formation Permis A Accélérée',
                    'description' => 'Formation intensive pour l\'obtention du permis A',
                    'montant' => 1200.00,
                    'type_permis_code' => 'A',
                    'session_code' => 'SESSION_INTENSIVE'
                ],

                // Formations Permis A2
                [
                    'nom' => 'Formation Permis A2',
                    'description' => 'Formation pour l\'obtention du permis A2 (moto 35kW)',
                    'montant' => 700.00,
                    'type_permis_code' => 'A2',
                    'session_code' => 'SESSION_MATIN'
                ],

                // Formations Permis A1
                [
                    'nom' => 'Formation Permis A1',
                    'description' => 'Formation pour l\'obtention du permis A1 (moto 125cm³)',
                    'montant' => 600.00,
                    'type_permis_code' => 'A1',
                    'session_code' => 'SESSION_MATIN'
                ],

                // Formations Permis BE
                [
                    'nom' => 'Formation Permis BE',
                    'description' => 'Formation pour l\'obtention du permis BE (B + remorque)',
                    'montant' => 500.00,
                    'type_permis_code' => 'BE',
                    'session_code' => 'SESSION_MATIN'
                ],

                // Formations Permis C
                [
                    'nom' => 'Formation Permis C',
                    'description' => 'Formation pour l\'obtention du permis C (poids lourd)',
                    'montant' => 2000.00,
                    'type_permis_code' => 'C',
                    'session_code' => 'SESSION_INTENSIVE'
                ],

                // Formations Permis D
                [
                    'nom' => 'Formation Permis D',
                    'description' => 'Formation pour l\'obtention du permis D (transport en commun)',
                    'montant' => 2500.00,
                    'type_permis_code' => 'D',
                    'session_code' => 'SESSION_INTENSIVE'
                ]
            ];

            $createdCount = 0;

            foreach ($autoEcoles as $autoEcole) {
                foreach ($formationsData as $formationData) {
                    try {
                        // Trouver le type de permis
                        $typePermis = $typesPermis->where('code', $formationData['type_permis_code'])->first();
                        if (!$typePermis) {
                            $this->command->warn("⚠️ Type de permis {$formationData['type_permis_code']} non trouvé");
                            continue;
                        }

                        // Trouver la session
                        $session = $sessions->where('code', $formationData['session_code'])->first();
                        if (!$session) {
                            $this->command->warn("⚠️ Session {$formationData['session_code']} non trouvée");
                            continue;
                        }

                        // Vérifier si la formation existe déjà pour cette auto-école
                        $existingFormation = FormationAutoEcole::where('auto_ecole_id', $autoEcole->id)
                            ->where('type_permis_id', $typePermis->id)
                            ->where('session_id', $session->id)
                            ->first();

                        if ($existingFormation) {
                            $this->command->warn("⚠️ Formation {$formationData['nom']} existe déjà pour {$autoEcole->nom_auto_ecole}");
                            continue;
                        }

                        // Créer la formation
                        FormationAutoEcole::create([
                            'auto_ecole_id' => $autoEcole->id,
                            'type_permis_id' => $typePermis->id,
                            'montant' => $formationData['montant'],
                            'description' => $formationData['description'],
                            'session_id' => $session->id,
                            'statut' => true,
                        ]);

                        $createdCount++;
                        $this->command->info("✅ Formation créée : {$formationData['nom']} pour {$autoEcole->nom_auto_ecole}");

                    } catch (\Exception $e) {
                        $this->command->error("❌ Erreur création formation {$formationData['nom']}: " . $e->getMessage());
                    }
                }
            }

            $this->command->info("🎉 Formations créées : {$createdCount}");
        });
    }
}