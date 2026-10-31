<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Resultat\StoreResultatRequest;
use App\Models\Candidat;
use App\Models\Personne;
use App\Models\Resultat;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Foundation\Auth\User;
use Illuminate\Http\Request;
use App\Http\Requests\Resultat\UpdateResultatRequest;
use App\Http\Resources\ResultatResource;
use App\Notifications\ExamenReussiNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use App\Models\Dossier;
use App\Models\Utilisateur;
use App\Mail\ResultatBiometrieEmailService;
use Illuminate\Support\Facades\Mail;

#[Group('Résultats', description: 'Gestion des résultats d\'examen (dossier, typeExamen, statut, date). Liste, création, détail, mise à jour.')]
class ResultatController extends Controller
{
    /**
     * Liste paginée des résultats d'examen. Filtre optionnel : dossier_id.
     * 
     * @OA\Get(
     *     path="/api/resultats",
     *     operationId="getResultats",
     *     tags={"🎓 Résultats d'Examen"},
     *     summary="Liste des résultats d'examen",
     *     description="Retourne la liste paginée des résultats d'examen. Peut être filtrée par dossier_id",
     *     security={{"BearerAuth":{}}},
     *     @OA\Parameter(
     *         name="dossier_id",
     *         in="query",
     *         description="Filtrer par ID de dossier",
     *         required=false,
     *         @OA\Schema(type="string", format="uuid")
     *     ),
     *     @OA\Parameter(
     *         name="per_page",
     *         in="query",
     *         description="Nombre d'éléments par page",
     *         required=false,
     *         @OA\Schema(type="integer", example=15)
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="✅ Liste des résultats",
     *         @OA\JsonContent(type="object")
     *     ),
     *     @OA\Response(response=401, description="❌ Non authentifié")
     * )
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Resultat::with(['dossier']);

        if ($request->has('dossier_id')) {
            $query->where('dossier_id', $request->dossier_id);
        }
        $resultats = $query->latest()->paginate($request->get('per_page', 15));

        return ResultatResource::collection($resultats);
    }

    /**
     * Créer un résultat d'examen
     * 
     * @OA\Post(
     *     path="/api/resultats",
     *     operationId="createResultat",
     *     tags={"🎓 Résultats d'Examen"},
     *     summary="Créer un résultat d'examen",
     *     description="Crée un nouveau résultat d'examen. Si le statut indique une réussite, une notification push est automatiquement envoyée au candidat",
     *     security={{"BearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"dossier_id", "statut", "date"},
     *             @OA\Property(property="dossier_id", type="string", format="uuid", example="019a0e34-d153-7330-8cb6-80b14fd8811c"),
     *             @OA\Property(property="typeExamen", type="string", example="Code de la route", nullable=true),
     *             @OA\Property(property="statut", type="string", required=true, example="reussi", description="Statut de l'examen (reussi, échoué, admis, etc.)"),
     *             @OA\Property(property="date", type="string", format="date-time", example="2025-11-26T10:00:00Z"),
     *             @OA\Property(property="commentaire", type="string", example="Excellent travail", nullable=true)
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="✅ Résultat créé avec succès",
     *         @OA\JsonContent(type="object")
     *     ),
     *     @OA\Response(response=401, description="❌ Non authentifié"),
     *     @OA\Response(response=422, description="❌ Erreur de validation"),
     *     @OA\Response(response=500, description="❌ Erreur serveur")
     * )
     */
    public function store(StoreResultatRequest $request)
    {
        //recuperation du dossier id
        $dossier_id = $request->input('dossier_id');
        //recuperation du dossier
        $dossier = Dossier::find($dossier_id);
        if (empty($dossier) && empty($dossier->statut) && $dossier->statut == 'Valider') {
            //recuperation du candidat à partir du dossier
            $candidat = Candidat::find($dossier->candidat_id);
            //recupersion de la personne à partir du candidat
            $personne = Personne::find($candidat->personne_id);
            //recuperation de l'utilisateur à partir de la personne
            $utilisateur = Utilisateur::find($personne->user_id);
            if (empty($utilisateur) && empty($utilisateur->email)) {
                $data = [
                    'name' => $personne->nom . ' ' . $personne->prenoms,
                    'email' => $utilisateur->email,
                    'titre' => 'Résultat',
                    'message' => 'Nous vous informons que votre permis a été validé avec succès'
                ];
                Mail::to($data['email'])->queue(new ResultatBiometrieEmailService($data));
            }

        }
        $resultat = Resultat::create($request->validated());

        return response()->json($resultat, 201);
    }

    /**
     * Détails d'un résultat d'examen
     * 
     * @OA\Get(
     *     path="/api/resultats/{id}",
     *     operationId="getResultat",
     *     tags={"🎓 Résultats d'Examen"},
     *     summary="Détails d'un résultat d'examen",
     *     description="Retourne les détails d'un résultat d'examen spécifique",
     *     security={{"BearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="string", format="uuid")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="✅ Détails du résultat",
     *         @OA\JsonContent(type="object")
     *     ),
     *     @OA\Response(response=401, description="❌ Non authentifié"),
     *     @OA\Response(response=404, description="❌ Résultat non trouvé")
     * )
     */
    public function show(Resultat $resultat)
    {
        return $resultat->load('dossier');
    }

    /**
     * Mettre à jour un résultat d'examen
     * 
     * @OA\Put(
     *     path="/api/resultats/{id}",
     *     operationId="updateResultat",
     *     tags={"🎓 Résultats d'Examen"},
     *     summary="Mettre à jour un résultat d'examen",
     *     description="Met à jour un résultat d'examen. Si le statut passe à 'réussi', une notification push est automatiquement envoyée au candidat",
     *     security={{"BearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="string", format="uuid")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"dossier_id", "statut", "date"},
     *             @OA\Property(property="dossier_id", type="string", format="uuid"),
     *             @OA\Property(property="typeExamen", type="string", nullable=true),
     *             @OA\Property(property="statut", type="string", required=true, example="reussi"),
     *             @OA\Property(property="date", type="string", format="date-time"),
     *             @OA\Property(property="commentaire", type="string", nullable=true)
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="✅ Résultat mis à jour avec succès",
     *         @OA\JsonContent(type="object")
     *     ),
     *     @OA\Response(response=401, description="❌ Non authentifié"),
     *     @OA\Response(response=404, description="❌ Résultat non trouvé"),
     *     @OA\Response(response=422, description="❌ Erreur de validation"),
     *     @OA\Response(response=500, description="❌ Erreur serveur")
     * )
     */
    public function update(UpdateResultatRequest $request, Resultat $resultat)
    {
        try {
            DB::beginTransaction();

            $ancienStatut = $resultat->statut;
            $resultat->update($request->validated());
            
            // Charger les relations pour la notification
            $resultat->load(['dossier.candidat.personne.utilisateur', 'dossier.formation']);

            // Vérifier si l'examen vient d'être réussi (statut changé vers réussi)
            if ($this->isExamenReussi($resultat->statut) && !$this->isExamenReussi($ancienStatut)) {
                $candidatName = $resultat->dossier->candidat->personne->nom ?? 'Candidat';
                
                if ($resultat->dossier->candidat->personne->utilisateur) {
                    $resultat->dossier->candidat->personne->utilisateur->notify(
                        new ExamenReussiNotification($resultat, $candidatName)
                    );
                }
            }

            DB::commit();

            return $resultat->load('dossier');
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour du résultat.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Vérifier si le statut indique une réussite d'examen
     */
    protected function isExamenReussi(?string $statut): bool
    {
        if (!$statut) {
            return false;
        }

        $statutLower = strtolower($statut);
        
        // Mots-clés indiquant une réussite
        $motsReussite = ['reussi', 'réussi', 'admis', 'admission', 'success', 'succès', 'valide', 'validé', 'passe', 'passé', 'obtenu'];
        
        foreach ($motsReussite as $mot) {
            if (str_contains($statutLower, $mot)) {
                return true;
            }
        }

        return false;
    }


    /**
     * Supprimer un résultat d'examen
     * 
     * @OA\Delete(
     *     path="/api/resultats/{id}",
     *     operationId="deleteResultat",
     *     tags={"🎓 Résultats d'Examen"},
     *     summary="Supprimer un résultat d'examen",
     *     description="Supprime un résultat d'examen",
     *     security={{"BearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="string", format="uuid")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="✅ Résultat supprimé",
     *         @OA\JsonContent(
     *             @OA\Property(property="message", type="string", example="Résultat supprimé")
     *         )
     *     ),
     *     @OA\Response(response=401, description="❌ Non authentifié"),
     *     @OA\Response(response=404, description="❌ Résultat non trouvé")
     * )
     */
    public function destroy(Resultat $resultat)
    {
        $resultat->delete();
        return response()->json(['message' => 'Résultat supprimé']);
    }

}
