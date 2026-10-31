<?php

namespace App\Services;
use Exception;
use Illuminate\Support\Facades\Log;
// ✅ AJOUTE CETTE LIGNE
use App\Models\ChangePermis;
class ChangePermisService
{
    public function createChangePermis($request)
    {
        try {
            $query = ChangePermis::query();

            // Vérification sécurisée de la présence du numéro
            if (!empty($request['numero_permis'])) {
                $query->where('numero_permis', 'LIKE', '%' . $request['numero_permis'] . '%');
            }

            $resultat = $query->get();

            // 1. Si aucun résultat n'est trouvé, on crée l'enregistrement
            if ($resultat->isEmpty()) {
                $nouveauPermis = ChangePermis::create($request);

                return response()->json([
                    'status' => 'created',
                    'message' => 'Permis créé avec succès',
                    'data' => $nouveauPermis
                ], 201); // 201 = Created
            }

            // 2. Si on a trouvé des résultats, on les renvoie
            return response()->json([
                'status' => 'exists',
                'message' => 'Des permis correspondants existent déjà',
                'body' => $resultat // Pas besoin de ->toJson(), response()->json le fait seul
            ], 200);

        } catch (Exception $e) {
            Log::error("Erreur createChangePermis : " . $e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Une erreur est survenue lors du traitement' . $e->getMessage()
            ], 500);
        }
    }


    public function getChangePermisByNumero($numero)
    {
        try {
            $resultat = ChangePermis::where('numero_permis', 'LIKE', '%' . $numero . '%')->get();

            if ($resultat->isEmpty()) {
                return response()->json([
                    'status' => 'not_found',
                    'message' => 'Aucun permis trouvé pour ce numéro'
                ], 404);
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Ce permis existe déjà',
                'data' => $resultat
            ], 200);

        } catch (Exception $e) {
            Log::error("Erreur getChangePermisByNumero : " . $e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Une erreur est survenue lors du traitement'
            ], 500);
        }
    }
}