<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Helpers\AuthHelper;
use App\Http\Requests\Candidat\StoreCandidatRequest;
use App\Http\Requests\Candidat\UpdateCandidatRequest;
use Dedoc\Scramble\Attributes\Endpoint;
use Dedoc\Scramble\Attributes\Group;
use Dedoc\Scramble\Attributes\QueryParameter;
use Dedoc\Scramble\Attributes\Response as ScrambleResponse;
use App\Http\Requests\Candidat\CompleteProfileRequest;
use App\Http\Requests\Candidat\InscriptionFormationRequest;
use App\Notifications\DossierCreatedNotification;
use App\Http\Resources\CandidatResource;
use App\Http\Resources\DossierResource;
use App\Http\Services\CandidatService;
use App\Models\Candidat;
use App\Models\Dossier;
use App\Models\Utilisateur;
use App\Models\FormationAutoEcole;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use App\Services\{CandidatFilterService, PaiementAirtelService, PaiementHistoriqueService};
/**
 * @OA\Server(
 *     url="http://localhost:8000",
 *     description="Serveur de développement local"
 * )
 * 
 * @OA\Server(
 *     url="https://9c8r7bbvybn.preview.infomaniak.website",
 *     description="Serveur de production Infomaniak"
 * )
 * 
 * @OA\Tag(
 *     name="👨‍🎓 Candidats",
 *     description="Gestion des candidats au permis de conduire"
 * )
 */
#[Group('Candidats', description: 'Gestion des candidats au permis de conduire, profil, dossiers et inscriptions formation.')]
class CandidatController extends Controller
{

    protected CandidatService $candidatService;
    protected $serviceCandidat;
    public function __construct(CandidatService $candidatService, CandidatFilterService $serviceCandidat)
    {
        $this->candidatService = $candidatService;
    }
    /**
     * Liste paginée des candidats avec personne. Filtres : personne_id, numero_candidat, nip, genre, nationalite.
     *
     * @OA\Get(
     *     path="/api/candidats",
     *     operationId="getCandidats",
     *     tags={"👨‍🎓 Candidats"},
     *     summary="📋 Liste de tous les candidats",
     *     description="Récupère la liste paginée de tous les candidats avec leurs informations personnelles",
     *     security={{"BearerAuth":{}}},
     *     @OA\Parameter(
     *         name="page",
     *         in="query",
     *         description="Numéro de page",
     *         required=false,
     *         @OA\Schema(type="integer", example=1)
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
     *         description="✅ Liste des candidats récupérée"
     *     ),
     *     @OA\Response(response=401, description="❌ Non authentifié")
     * )
     */
    #[Endpoint(title: 'Liste des candidats', description: 'Liste paginée des candidats avec personne. Filtres : personne_id, numero_candidat, nip, genre, nationalite.')]
    #[QueryParameter('personne_id', description: 'Filtrer par personne (UUID)', type: 'string', format: 'uuid', required: false)]
    #[QueryParameter('numero_candidat', description: 'Recherche par numéro candidat (partiel)', type: 'string', required: false)]
    #[QueryParameter('nip', description: 'Recherche par NIP (partiel)', type: 'string', required: false)]
    #[QueryParameter('genre', description: 'Filtrer par genre', type: 'string', required: false)]
    #[QueryParameter('nationalite', description: 'Filtrer par nationalité', type: 'string', required: false)]
    #[QueryParameter('per_page', description: 'Nombre d\'éléments par page (défaut 15)', type: 'integer', required: false)]
    #[ScrambleResponse(200, 'Liste paginée des candidats avec relation personne.')]
    public function index(Request $request): AnonymousResourceCollection
    {
        $cacheKey = 'candidats:' . md5(json_encode($request->all()));
        $candidats = Cache::tags(['candidats'])->remember($cacheKey, 3600, function () use ($request) {
            $perPage = $request->get('per_page', 15);

            return Candidat::with('personne')
                ->byPersonne($request->personne_id)

                ->when(
                    $request->numero_candidat,
                    fn($q) =>
                    $q->where('numero_candidat', 'like', "%{$request->numero_candidat}%")
                )

                ->when(
                    $request->nip,
                    fn($q) =>
                    $q->where('nip', 'like', "%{$request->nip}%")
                )

                ->when(
                    $request->genre,
                    fn($q) =>
                    $q->where('genre', $request->genre)
                )

                ->when(
                    $request->nationalite,
                    fn($q) =>
                    $q->where('nationalite', $request->nationalite)
                )

                // Renouvellement simplifié : retrouver le candidat à partir de l'identité du permis
                ->when(
                    $request->date_naissance,
                    fn($q) =>
                    $q->whereDate('date_naissance', $request->date_naissance)
                )

                ->when(
                    $request->nom,
                    fn($q) =>
                    $q->whereHas('personne', fn($p) => $p->whereRaw('LOWER(nom) = ?', [mb_strtolower(trim($request->nom))]))
                )

                ->when(
                    $request->prenom,
                    fn($q) =>
                    $q->whereHas('personne', fn($p) => $p->whereRaw('LOWER(prenom) = ?', [mb_strtolower(trim($request->prenom))]))
                )

                ->latest()
                ->paginate($perPage);
        });

        return CandidatResource::collection($candidats);
    }

    /**
     * Crée un nouveau candidat. Champs requis : personne_id, numero_candidat, date_naissance, lieu_naissance, type_piece, numero_piece, nationalite, genre. Optionnel : nip.
     *
     * @OA\Post(
     *     path="/api/candidats",
     *     operationId="storeCandidat",
     *     tags={"👨‍🎓 Candidats"},
     *     summary="➕ Créer un nouveau candidat",
     *     description="Crée un nouveau candidat avec ses informations personnelles",
     *     security={{"BearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"personne_id","numero_candidat","date_naissance","lieu_naissance","type_piece","numero_piece","nationalite","genre"},
     *             @OA\Property(property="personne_id", type="string", format="uuid", example="019a0e34-d153-7330-8cb6-80b14fd8811c"),
     *             @OA\Property(property="numero_candidat", type="string", example="CAN-2025-001"),
     *             @OA\Property(property="date_naissance", type="string", format="date", example="1995-05-15"),
     *             @OA\Property(property="lieu_naissance", type="string", example="Dakar"),
     *             @OA\Property(property="nip", type="string", nullable=true, example="1234567890123", description="Optionnel"),
     *             @OA\Property(property="type_piece", type="string", example="CNI"),
     *             @OA\Property(property="numero_piece", type="string", example="1234567890"),
     *             @OA\Property(property="nationalite", type="string", example="Sénégalaise"),
     *             @OA\Property(property="genre", type="string", enum={"M","F"}, example="M")
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="✅ Candidat créé avec succès"
     *     ),
     *     @OA\Response(response=401, description="❌ Non authentifié"),
     *     @OA\Response(response=422, description="❌ Erreur de validation")
     * )
     */
    #[ScrambleResponse(201, 'Candidat créé. Retourne success, message et data (CandidatResource avec personne).')]
    #[ScrambleResponse(401, 'Non authentifié.')]
    #[ScrambleResponse(422, 'Erreur de validation (personne_id, numero_candidat, date_naissance, type_piece, etc.). nip optionnel.')]
    public function store(StoreCandidatRequest $request): JsonResponse
    {
        try {
            DB::beginTransaction();

            $candidat = Candidat::create($request->validated());


            DB::commit();
            Cache::tags(['candidats'])->flush();

            Log::info('Candidat créé', ['candidat_id' => $candidat->id]);

            return response()->json([
                'success' => true,
                'message' => 'Candidat créé avec succès.',
                'data' => new CandidatResource($candidat->load('personne'))
            ], 201);

        } catch (Exception $e) {
            DB::rollBack();

            Log::error('Erreur création candidat', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création du candidat.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/candidats/{id}",
     *     operationId="getCandidat",
     *     tags={"👨‍🎓 Candidats"},
     *     summary="🔍 Détails d'un candidat",
     *     description="Récupère les détails complets d'un candidat",
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         description="ID du candidat",
     *         required=true,
     *         @OA\Schema(type="string", format="uuid")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="✅ Détails du candidat"
     *     ),
     *     @OA\Response(response=404, description="❌ Candidat non trouvé")
     * )
     */
    public function show(string $id): JsonResponse
    {
        try {
            $candidat = Cache::tags(['candidats'])->remember("candidats:id:{$id}", 3600, function () use ($id) {
                return Candidat::with(['personne', 'dossiers'])->findOrFail($id);
            });

            return response()->json([
                'success' => true,
                'data' => new CandidatResource($candidat)
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Candidat non trouvé.'
            ], 404);
        }
    }

    /**
     * @OA\Put(
     *     path="/api/candidats/{id}",
     *     operationId="updateCandidat",
     *     tags={"👨‍🎓 Candidats"},
     *     summary="✏️ Mettre à jour un candidat",
     *     description="Met à jour les informations d'un candidat",
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         description="ID du candidat",
     *         required=true,
     *         @OA\Schema(type="string", format="uuid")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="numero_candidat", type="string", example="CAN-2025-001"),
     *             @OA\Property(property="date_naissance", type="string", format="date", example="1995-05-15"),
     *             @OA\Property(property="lieu_naissance", type="string", example="Dakar"),
     *             @OA\Property(property="type_piece", type="string", example="CNI"),
     *             @OA\Property(property="numero_piece", type="string", example="1234567890"),
     *             @OA\Property(property="nationalite", type="string", example="Sénégalaise")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="✅ Candidat mis à jour"
     *     ),
     *     @OA\Response(response=404, description="❌ Candidat non trouvé"),
     *     @OA\Response(response=422, description="❌ Erreur de validation")
     * )
     */
    public function update(UpdateCandidatRequest $request, string $id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $candidat = Candidat::findOrFail($id);
            $candidat->update($request->validated());

            DB::commit();
            Cache::tags(['candidats'])->flush();

            Log::info('Candidat mis à jour', ['candidat_id' => $candidat->id]);

            return response()->json([
                'success' => true,
                'message' => 'Candidat mis à jour avec succès.',
                'data' => new CandidatResource($candidat->load('personne'))
            ]);

        } catch (Exception $e) {
            DB::rollBack();

            Log::error('Erreur mise à jour candidat', [
                'candidat_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour du candidat.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * @OA\Delete(
     *     path="/api/candidats/{id}",
     *     operationId="deleteCandidat",
     *     tags={"👨‍🎓 Candidats"},
     *     summary="🗑️ Supprimer un candidat",
     *     description="Supprime un candidat et ses dossiers associés",
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         description="ID du candidat",
     *         required=true,
     *         @OA\Schema(type="string", format="uuid")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="✅ Candidat supprimé",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Candidat supprimé avec succès.")
     *         )
     *     ),
     *     @OA\Response(response=404, description="❌ Candidat non trouvé")
     * )
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $candidat = Candidat::findOrFail($id);
            $candidat->delete();

            DB::commit();
            Cache::tags(['candidats'])->flush();

            Log::info('Candidat supprimé', ['candidat_id' => $id]);

            return response()->json([
                'success' => true,
                'message' => 'Candidat supprimé avec succès.'
            ]);

        } catch (Exception $e) {
            DB::rollBack();

            Log::error('Erreur suppression candidat', [
                'candidat_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression du candidat.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * @OA\Post(
     *     path="/api/candidats/complete-profile",
     *     operationId="completeProfile",
     *     tags={"👨‍🎓 Candidats"},
     *     summary="✅ Compléter le profil candidat",
     *     description="Permet à un utilisateur connecté de compléter son profil candidat avec ses informations personnelles",
     *     security={{"BearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"date_naissance","lieu_naissance","type_piece","numero_piece","nationalite","genre"},
     *             @OA\Property(property="date_naissance", type="string", format="date", example="1995-05-15"),
     *             @OA\Property(property="lieu_naissance", type="string", example="Dakar"),
     *             @OA\Property(property="nip", type="string", nullable=true, example="1234567890123", description="Optionnel"),
     *             @OA\Property(property="type_piece", type="string", example="CNI"),
     *             @OA\Property(property="numero_piece", type="string", example="1234567890"),
     *             @OA\Property(property="nationalite", type="string", example="Sénégalaise"),
     *             @OA\Property(property="genre", type="string", enum={"M","F"}, example="M")
     *         )
     *     ),
     *     @OA\Response(response=201, description="✅ Profil candidat complété"),
     *     @OA\Response(response=400, description="❌ Profil déjà complété"),
     *     @OA\Response(response=401, description="❌ Non authentifié")
     * )
     */
    public function completeProfile(CompleteProfileRequest $request): JsonResponse
    {
        try {
            DB::beginTransaction();

            // Récupérer l'utilisateur depuis le token
            $user = AuthHelper::getAuthenticatedUser($request);

            if (!$user || !$user->personne) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur non trouvé.'
                ], 404);
            }

            // Vérifier si le candidat existe déjà
            $existingCandidat = Candidat::where('personne_id', $user->personne->id)->first();
            if ($existingCandidat) {
                return response()->json([
                    'success' => false,
                    'message' => 'Votre profil candidat est déjà complété.'
                ], 400);
            }

            // Générer un numéro de candidat unique
            $numeroCandidat = $this->generateNumeroCandidat();

            // Créer le candidat
            $candidat = Candidat::create([
                'personne_id' => $user->personne->id,
                'numero_candidat' => $numeroCandidat,
                'date_naissance' => $request->date_naissance,
                'lieu_naissance' => $request->lieu_naissance,
                'nip' => $request->nip,
                'type_piece' => $request->type_piece,
                'numero_piece' => $request->numero_piece,
                'nationalite' => $request->nationalite,
                'genre' => $request->genre,
            ]);

            DB::commit();

            Log::info('Profil candidat complété', [
                'candidat_id' => $candidat->id,
                'personne_id' => $user->personne->id,
                'numero_candidat' => $numeroCandidat
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Profil candidat complété avec succès !',
                'data' => new CandidatResource($candidat->load('personne'))
            ], 201);

        } catch (Exception $e) {
            DB::rollBack();

            Log::error('Erreur complétion profil candidat', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la complétion du profil.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * @OA\Post(
     *     path="/api/candidats/inscription-formation",
     *     operationId="inscriptionFormation",
     *     tags={"👨‍🎓 Candidats"},
     *     summary="🎓 S'inscrire à une formation",
     *     description="Permet à un candidat de s'inscrire à une formation dans une auto-école. Crée automatiquement un dossier.",
     *     security={{"BearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"auto_ecole_id","formation_id"},
     *             @OA\Property(property="auto_ecole_id", type="string", format="uuid"),
     *             @OA\Property(property="formation_id", type="string", format="uuid"),
     *             @OA\Property(property="commentaires", type="string", example="Je souhaite commencer dès que possible")
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="✅ Inscription réussie",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Inscription à la formation réussie !"),
     *             @OA\Property(property="dossier", type="object")
     *         )
     *     ),
     *     @OA\Response(response=400, description="❌ Candidat non trouvé ou déjà inscrit"),
     *     @OA\Response(response=404, description="❌ Formation non trouvée")
     * )
     */
    public function inscriptionFormation(InscriptionFormationRequest $request): JsonResponse
    {
        try {
            DB::beginTransaction();

            // Récupérer le candidat depuis le token
            $user = AuthHelper::getAuthenticatedUser($request);

            if (!$user || !$user->personne || !$user->personne->candidat) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous devez d\'abord compléter votre profil candidat.'
                ], 400);
            }

            $candidat = $user->personne->candidat;

            // Vérifier que la formation existe et appartient à l'auto-école
            $formation = FormationAutoEcole::where('id', $request->formation_id)
                ->where('auto_ecole_id', $request->auto_ecole_id)
                ->where('statut', true)
                ->first();

            if (!$formation) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cette formation n\'existe pas ou n\'est plus disponible.'
                ], 404);
            }

            // Vérifier si le candidat n'est pas déjà inscrit à cette formation
            $existingDossier = Dossier::where('candidat_id', $candidat->id)
                ->where('formation_id', $formation->id)
                ->whereIn('statut', ['en_attente', 'en_cours', 'valide'])
                ->first();

            if ($existingDossier) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous êtes déjà inscrit à cette formation.'
                ], 400);
            }

            // Créer le dossier (sans etape_id pour l'instant)
            $dossier = Dossier::create([
                'candidat_id' => $candidat->id,
                'auto_ecole_id' => $request->auto_ecole_id,
                'formation_id' => $request->formation_id,
                'statut' => 'en_attente',
                'date_creation' => now(),
                'commentaires' => $request->commentaires,
                'etape_id' => null, // Pas d'étape au départ
            ]);

            // Charger les relations pour la notification
            $dossier->load(['candidat.personne', 'autoEcole.responsable.utilisateur', 'formation.typePermis']);

            // Envoyer une notification à l'auto-école
            $candidatName = $candidat->personne->nom ?? 'Candidat';
            $autoEcole = $dossier->autoEcole;

            if ($autoEcole && $autoEcole->responsable && $autoEcole->responsable->utilisateur) {
                $autoEcole->responsable->utilisateur->notify(
                    new DossierCreatedNotification($dossier, $candidatName)
                );
            }

            DB::commit();

            Log::info('Inscription à une formation', [
                'candidat_id' => $candidat->id,
                'formation_id' => $formation->id,
                'dossier_id' => $dossier->id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Inscription à la formation réussie !',
                'dossier' => new DossierResource($dossier->load(['candidat.personne', 'autoEcole', 'formation']))
            ], 201);

        } catch (Exception $e) {
            DB::rollBack();

            Log::error('Erreur inscription formation', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'inscription.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/candidats/mes-dossiers",
     *     operationId="mesDossiers",
     *     tags={"👨‍🎓 Candidats"},
     *     summary="📁 Mes dossiers",
     *     description="Récupère tous les dossiers du candidat connecté",
     *     security={{"BearerAuth":{}}},
     *     @OA\Response(
     *         response=200,
     *         description="✅ Liste des dossiers du candidat",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="dossiers", type="array", @OA\Items(type="object"))
     *         )
     *     ),
     *     @OA\Response(response=400, description="❌ Profil candidat non complété")
     * )
     */
    #[Endpoint(title: 'Mes dossiers (candidat)', description: 'Liste paginée des dossiers du candidat connecté.')]
    #[QueryParameter('per_page', description: 'Nombre d\'éléments par page (1-100, défaut 15)', type: 'integer', required: false)]
    #[QueryParameter('page', description: 'Numéro de page', type: 'integer', required: false)]
    #[ScrambleResponse(200, 'success, candidat, dossiers (page), total_dossiers, pagination.')]
    #[ScrambleResponse(400, 'Profil candidat incomplet.')]
    public function mesDossiers(Request $request): JsonResponse
    {
        try {
            // Récupérer le candidat depuis le token
            $user = AuthHelper::getAuthenticatedUser($request);

            if (!$user || !$user->personne || !$user->personne->candidat) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous devez d\'abord compléter votre profil candidat.'
                ], 400);
            }

            $candidat = $user->personne->candidat;

            $perPage = $this->perPage($request);
            $paginator = Dossier::where('candidat_id', $candidat->id)
                ->with(['autoEcole', 'formation.typePermis', 'documents'])
                ->latest()
                ->paginate($perPage);

            return response()->json([
                'success' => true,
                'candidat' => new CandidatResource($candidat->load('personne')),
                'dossiers' => DossierResource::collection($paginator->items()),
                'total_dossiers' => $paginator->total(),
                'pagination' => [
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Erreur récupération dossiers candidat', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des dossiers.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    private function generateNumeroCandidat(): string
    {
        $year = date('Y');
        $lastCandidat = Candidat::whereYear('created_at', $year)
            ->orderBy('created_at', 'desc')
            ->first();

        $number = $lastCandidat ? intval(substr($lastCandidat->numero_candidat, -3)) + 1 : 1;

        return sprintf('CAN-%s-%03d', $year, $number);
    }

    public function checkIdentity(Request $request)
    {
        $documentNumber = $request->query('documentNumber');
        $result = $this->candidatService->dgdiCheckRequest($documentNumber);
        return response()->json($result);
    }
}


