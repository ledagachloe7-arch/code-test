<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;
use App\Models\{Etape, Transition, JournalTransition, ResultatTransition};

class WorkflowService
{

    /**
     * Fait passer un model sur une autre étape .
     *
     * @param  Model  $model
     * @param  string   $circuitId circuit dans lequel se trouve le model
     * @param  string   $transitionId la transition vers laquelle on souhaite faire basculer le model
     * @return Json
     */

    public function moveModel(string $circuitId, string $transitionId, Model $model, ?string $commentaire = null)
    {
        return DB::transaction(function () use ($circuitId, $transitionId, $model, $commentaire) {

            $currentStatut = $model->statut;

            // 1️⃣ Récupérer l’étape correspondant au statut actuel
            $etape = Etape::where('circuit_id', $circuitId)
                ->where('statut_libelle', $currentStatut)
                ->first();

            if (!$etape) {
                throw new \Exception("Aucune étape trouvée pour le statut actuel : {$currentStatut}");
            }

            // 2️⃣ Récupérer toutes les transitions sortantes de cette étape
            $transitions = Transition::where('source_etape_id', $etape->id)->get();

            if ($transitions->isEmpty()) {
                throw new \Exception("Aucune transition sortante trouvée pour cette étape.");
            }

            // 3️⃣ Vérifier la transition demandée
            $transition = $transitions->firstWhere('id', $transitionId);

            if (!$transition) {
                throw new \Exception("La transition spécifiée n’est pas valide pour cette étape.");
            }

            // 4️⃣ Récupérer l’étape cible
            $etapeCible = Etape::find($transition->cible_etape_id);

            if (!$etapeCible) {
                throw new \Exception("Étape cible introuvable pour cette transition.");
            }

            // 5️⃣ Mettre à jour le modèle
            $model->update([
                'statut' => $etapeCible->statut_libelle,
            ]);
            
            // 6️⃣ Créer une trace dans le journal
            $journal = JournalTransition::create([
                'transition_id'     => $transition->id,
                'circuit_id'        => $circuitId,
                'auteur'            => auth()->user()?->name ?? 'Système',
                'commentaire'       => $commentaire,
                'date_heure'        => now(),
                'resultat'          => ResultatTransition::SUCCESS->value,
            ]);

            // 7️⃣ Retourner le journal (et pas directement le modèle)
            return response()->json([
                'message' => "Transition appliquée avec succès.",
                'journal' => $journal->fresh(), // inclut les valeurs calculées par le boot()
            ], 200);
        });
    }
}
