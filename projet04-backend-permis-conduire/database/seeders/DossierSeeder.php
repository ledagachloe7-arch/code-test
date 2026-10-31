<?php

namespace Database\Seeders;

use App\Models\Dossier;
use App\Models\Candidat;
use App\Models\AutoEcole;
use App\Models\FormationAutoEcole;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DossierSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::transaction(function () {
            // Récupérer les candidats avec leur personne
            $candidats = Candidat::with('personne')->get();
            
            // Filtrer les candidats qui ont bien une personne associée
            $candidats = $candidats->filter(function ($candidat) {
                return $candidat->personne !== null;
            });
            
            if ($candidats->isEmpty()) {
                $totalCandidats = Candidat::count();
                $candidatsSansPersonne = Candidat::doesntHave('personne')->count();
                $this->command->warn("⚠️ Aucun candidat avec personne trouvé.");
                $this->command->warn("   - Total candidats en base : {$totalCandidats}");
                $this->command->warn("   - Candidats sans personne : {$candidatsSansPersonne}");
                $this->command->warn("   - Exécutez d'abord CandidatSeeder pour créer les candidats avec leurs personnes.");
                return;
            }
            
            $this->command->info("📋 {$candidats->count()} candidat(s) trouvé(s) avec personne associée");

            // Récupérer les auto-écoles
            $autoEcoles = AutoEcole::all();
            if ($autoEcoles->isEmpty()) {
                $this->command->warn('⚠️ Aucune auto-école trouvée. Exécutez d\'abord AutoEcoleSeeder.');
                return;
            }

            // Récupérer les formations
            $formations = FormationAutoEcole::with(['typePermis', 'autoEcole'])->get();
            if ($formations->isEmpty()) {
                $this->command->warn('⚠️ Aucune formation trouvée. Exécutez d\'abord FormationSeeder.');
                return;
            }

            $statuts = ['en_attente', 'en_cours', 'valide', 'rejete'];
            $commentaires = [
                'Candidat motivé, première inscription',
                'Candidat en cours de formation',
                'Dossier complet, prêt pour l\'examen',
                'Candidat assidu, bon niveau',
                'Formation en cours, tout se passe bien',
                'Dossier validé, examen réussi',
                'Candidat régulier, progression normale',
                'Dossier rejeté, documents manquants',
                'Candidat sérieux, formation de qualité',
                'Dossier en attente de validation',
                'Candidat expérimenté, formation accélérée',
                'Dossier complet, en attente d\'examen',
                'Candidat débutant, formation standard',
                'Dossier validé, permis obtenu',
                'Candidat motivé, formation intensive'
            ];

            $createdCount = 0;

            foreach ($candidats as $candidat) {
                // Chaque candidat aura entre 1 et 3 dossiers
                $nombreDossiers = rand(1, 3);
                
                for ($i = 0; $i < $nombreDossiers; $i++) {
                    try {
                        // Sélectionner une auto-école aléatoire
                        $autoEcole = $autoEcoles->random();
                        
                        // Sélectionner une formation de cette auto-école
                        $formationsAutoEcole = $formations->where('auto_ecole_id', $autoEcole->id);
                        if ($formationsAutoEcole->isEmpty()) {
                            continue; // Passer à la suivante si pas de formation
                        }
                        $formation = $formationsAutoEcole->random();

                        // Vérifier si le dossier existe déjà
                        $existingDossier = Dossier::where('candidat_id', $candidat->id)
                            ->where('auto_ecole_id', $autoEcole->id)
                            ->where('formation_id', $formation->id)
                            ->first();

                        if ($existingDossier) {
                            continue; // Passer au suivant si existe déjà
                        }

                        // Générer un statut aléatoire
                        $statut = $statuts[array_rand($statuts)];
                        
                        // Générer une date de création aléatoire (entre 1 et 90 jours dans le passé)
                        $dateCreation = now()->subDays(rand(1, 90));
                        
                        // Si le statut n'est pas "en_attente", générer une date de mise à jour
                        $dateModification = null;
                        if ($statut !== 'en_attente') {
                            $dateModification = $dateCreation->copy()->addDays(rand(1, 30));
                        }

                        // Créer le dossier avec les timestamps personnalisés
                        $dossier = Dossier::create([
                            'candidat_id' => $candidat->id,
                            'auto_ecole_id' => $autoEcole->id,
                            'formation_id' => $formation->id,
                            'statut' => $statut,
                            'commentaires' => $commentaires[array_rand($commentaires)],
                        ]);
                        
                        // Mettre à jour les timestamps manuellement
                        $dossier->created_at = $dateCreation;
                        $dossier->updated_at = $dateModification ?? $dateCreation;
                        $dossier->save();

                        $createdCount++;
                        $this->command->info("✅ Dossier créé : {$candidat->personne->prenom} {$candidat->personne->nom} - {$autoEcole->nom_auto_ecole} - {$formation->typePermis->libelle} ({$statut})");

                    } catch (\Exception $e) {
                        $this->command->error("❌ Erreur création dossier pour {$candidat->personne->prenom} {$candidat->personne->nom}: " . $e->getMessage());
                    }
                }
            }

            $this->command->info("🎉 Dossiers créés : {$createdCount}");
        });
    }
}