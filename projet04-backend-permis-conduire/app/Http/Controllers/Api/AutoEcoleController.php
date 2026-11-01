<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Helpers\AuthHelper;
use App\Http\Requests\AutoEcole\StoreAutoEcoleRequest;
use App\Http\Requests\AutoEcole\UpdateAutoEcoleRequest;
use App\Http\Resources\AutoEcoleCompletResource;
use App\Http\Resources\AutoEcoleResource;
use App\Http\Resources\FormationAutoEcoleResource;
use App\Http\Resources\DossierResource;
use App\Models\AutoEcole;
use App\Models\FormationAutoEcole;
use App\Models\Dossier;
use App\Models\Utilisateur;
use Dedoc\Scramble\Attributes\Endpoint;
use Dedoc\Scramble\Attributes\Group;
use Dedoc\Scramble\Attributes\Response as ScrambleResponse;
use Dedoc\Scramble\Attributes\QueryParameter;
use Dedoc\Scramble\Attributes\PathParameter;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

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
 *     name="🏫 Auto-Écoles",
 *     description="Gestion des auto-écoles"
 * )
 */
#[Group(
    'Auto-écoles',
    description: 'CRUD auto-écoles (auth Bearer). **`GET /auto-ecoles`** : liste paginée standard (inclut dossiers). **`GET /auto-ecoles/complets`** : liste enrichie sans dossiers. **`GET /auto-ecoles/cnepc`** : fiche **CNEPC** seule (même schéma que complets). **`GET /auto-ecoles/mes-dossiers`** : dossiers du responsable. **`GET /auto-ecoles/{id}/formations`** : formations actives.'
)]
class AutoEcoleController extends Controller
{
    private const CNEPC_NOM = 'CNEPC';
    /**
     * Liste paginée des auto-écoles avec responsable, province, dossiers, formations. Filtre optionnel : statut.
     *
     * @OA\Get(
     *     path="/api/auto-ecoles",
     *     operationId="getAutoEcoles",
     *     tags={"🏫 Auto-Écoles"},
     *     summary="📋 Liste de toutes les auto-écoles",
     *     description="Récupère la liste paginée de toutes les auto-écoles",
     *     @OA\Parameter(name="page", in="query", @OA\Schema(type="integer")),
     *     @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer")),
     *     @OA\Parameter(name="statut", in="query", @OA\Schema(type="boolean"), description="Filtrer par statut"),
     *     @OA\Response(response=200, description="✅ Liste des auto-écoles")
     * )
     */
    #[Endpoint(
        operationId: 'listAutoEcoles',
        title: 'Liste des auto-écoles',
        description: 'Liste paginée au format **Laravel Resource** (`data`, `links`, `meta`). Chaque auto-école inclut responsable, province, **dossiers** et formations (`typePermis` uniquement). Pour une vue enrichie sans dossiers, utiliser **`GET /auto-ecoles/complets`**.'
    )]
    #[QueryParameter('statut', description: 'Filtrer par statut actif (`true`) ou inactif (`false`).', type: 'boolean', required: false)]
    #[QueryParameter('per_page', description: 'Nombre d\'éléments par page (défaut 15).', type: 'integer', required: false)]
    #[QueryParameter('page', description: 'Numéro de page (défaut 1).', type: 'integer', required: false)]
    #[ScrambleResponse(200, 'Collection paginée `AutoEcoleResource` : responsable, province, dossiers, formations.typePermis.')]
    public function index(Request $request): AnonymousResourceCollection
    {
        $cacheKey = 'auto_ecoles:index:' . md5(json_encode($request->all()));
        $autoEcoles = Cache::tags(['auto_ecoles'])->remember($cacheKey, 3600, function () use ($request) {
            $query = AutoEcole::with(['responsable','province', 'dossiers','formations.typePermis']);

            if ($request->has('statut')) {
                $query->where('statut', $request->boolean('statut'));
            }

            return $query->latest()->paginate($request->get('per_page', 15));
        });

        return AutoEcoleResource::collection($autoEcoles);
    }

    /**
     * Liste paginée des auto-écoles avec responsable, province et formations (type_permis, session). Sans dossiers.
     */
    #[Endpoint(
        operationId: 'listAutoEcolesComplets',
        title: 'Liste complète des auto-écoles (sans dossiers)',
        description: 'Retourne les auto-écoles avec **responsable**, **province** (référentiel avec `parent` / `children`) et **formations** (`type_permis` et `session`). **Aucun dossier** (ni au niveau auto-école, ni dans les formations). Pagination explicite dans `meta` et `links`. Schéma **AutoEcoleCompletResource** / **FormationAutoEcoleCompletResource**. Authentification Bearer requise.'
    )]
    #[QueryParameter('statut', description: 'Filtrer par statut actif (`true`) ou inactif (`false`).', type: 'boolean', required: false)]
    #[QueryParameter('per_page', description: 'Nombre d\'auto-écoles par page (défaut 15, maximum 100).', type: 'integer', required: false)]
    #[QueryParameter('page', description: 'Numéro de page à retourner (défaut 1).', type: 'integer', required: false)]
    #[ScrambleResponse(
        200,
        'Corps JSON : `success`, `message`, `data` (tableau **AutoEcoleCompletResource**), `meta` (pagination), `links` (URLs de navigation).',
        type: 'array{success: bool, message: string, data: list<App\Http\Resources\AutoEcoleCompletResource>, meta: array{current_page: int, last_page: int, per_page: int, total: int, from: int|null, to: int|null}, links: array{first: string|null, last: string|null, prev: string|null, next: string|null}}'
    )]
    #[ScrambleResponse(401, 'Jeton Bearer absent ou invalide.', type: 'array{message: string}')]
    public function indexComplets(Request $request): JsonResponse
    {
        $cacheKey = 'auto_ecoles:complets:' . md5(json_encode($request->all()));
        $data = Cache::tags(['auto_ecoles'])->remember($cacheKey, 3600, function () use ($request) {
            $query = AutoEcole::query()->with($this->autoEcoleCompletRelations());

            if ($request->has('statut')) {
                $query->where('statut', $request->boolean('statut'));
            }

            $autoEcoles = $query->latest()->paginate($this->perPage($request));

            return [
                'data' => AutoEcoleCompletResource::collection($autoEcoles->items())->resolve(),
                'meta' => [
                    'current_page' => $autoEcoles->currentPage(),
                    'last_page' => $autoEcoles->lastPage(),
                    'per_page' => $autoEcoles->perPage(),
                    'total' => $autoEcoles->total(),
                    'from' => $autoEcoles->firstItem(),
                    'to' => $autoEcoles->lastItem(),
                ],
                'links' => [
                    'first' => $autoEcoles->url(1),
                    'last' => $autoEcoles->url($autoEcoles->lastPage()),
                    'prev' => $autoEcoles->previousPageUrl(),
                    'next' => $autoEcoles->nextPageUrl(),
                ],
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Liste des auto-écoles récupérée avec succès.',
            'data' => $data['data'],
            'meta' => $data['meta'],
            'links' => $data['links'],
        ]);
    }

    /**
     * Fiche de l'auto-école CNEPC (nom exact) avec formations, sans dossiers — même schéma que /complets.
     */
    #[Endpoint(
        operationId: 'getAutoEcoleCnepc',
        title: 'Auto-école CNEPC',
        description: 'Retourne **uniquement** l\'auto-école dont `nom_auto_ecole` vaut **CNEPC** (correspondance exacte, sensible à la casse), avec responsable, province et formations (`type_permis`, `session`). Même format que **`GET /auto-ecoles/complets`** pour un seul enregistrement : `success`, `message`, `data` (**AutoEcoleCompletResource**). Aucun dossier.'
    )]
    #[ScrambleResponse(
        200,
        '`success`, `message`, `data` : AutoEcoleCompletResource (CNEPC + formations).',
        type: 'array{success: bool, message: string, data: App\Http\Resources\AutoEcoleCompletResource}'
    )]
    #[ScrambleResponse(404, 'Aucune auto-école nommée CNEPC en base.', type: 'array{success: bool, message: string}')]
    #[ScrambleResponse(401, 'Jeton Bearer absent ou invalide.', type: 'array{message: string}')]
    public function showCnepc(): JsonResponse
    {
        $cached = Cache::tags(['auto_ecoles'])->remember('auto_ecoles:cnepc', 3600, function () {
            $autoEcole = AutoEcole::query()
                ->with($this->autoEcoleCompletRelations())
                ->where('nom_auto_ecole', self::CNEPC_NOM)
                ->first();

            return $autoEcole ? (new AutoEcoleCompletResource($autoEcole))->resolve() : null;
        });

        if (!$cached) {
            return response()->json([
                'success' => false,
                'message' => 'Auto-école CNEPC introuvable.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Auto-école CNEPC récupérée avec succès.',
            'data' => $cached,
        ]);
    }

    /**
     * Liste publique des auto-écoles actives (sans auth). Filtres : search (nom), ville (adresse), per_page (max 50).
     *
     * @OA\Get(
     *     path="/api/public/auto-ecoles",
     *     operationId="getPublicAutoEcoles",
     *     tags={"🏫 Auto-Écoles"},
     *     summary="🌐 Liste publique des auto-écoles",
     *     description="Récupère la liste de toutes les auto-écoles actives pour les candidats (endpoint public sans authentification)",
     *     @OA\Parameter(name="page", in="query", @OA\Schema(type="integer"), description="Numéro de page"),
     *     @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer"), description="Nombre d'éléments par page (max 50)"),
     *     @OA\Parameter(name="search", in="query", @OA\Schema(type="string"), description="Recherche par nom d'auto-école"),
     *     @OA\Parameter(name="ville", in="query", @OA\Schema(type="string"), description="Filtrer par ville"),
     *     @OA\Response(
     *         response=200,
     *         description="✅ Liste des auto-écoles actives",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Liste des auto-écoles récupérée avec succès"),
     *             @OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/AutoEcolePublic")),
     *             @OA\Property(property="meta", type="object",
     *                 @OA\Property(property="current_page", type="integer", example=1),
     *                 @OA\Property(property="last_page", type="integer", example=3),
     *                 @OA\Property(property="per_page", type="integer", example=15),
     *                 @OA\Property(property="total", type="integer", example=45)
     *             ),
     *             @OA\Property(property="links", type="object")
     *         )
     *     ),
     *     @OA\Response(response=500, description="❌ Erreur serveur")
     * )
     */
    public function publicIndex(Request $request): JsonResponse
    {
        try {
            $query = AutoEcole::with(['responsable','province', 'dossiers','formations'])
                ->where('statut', true); // Seulement les auto-écoles actives

            // Recherche par nom
            if ($request->has('search') && !empty($request->search)) {
                $query->where('nom_auto_ecole', 'LIKE', '%' . $request->search . '%');
            }

            // Filtre par ville (basé sur l'adresse)
            if ($request->has('ville') && !empty($request->ville)) {
                $query->where('adresse', 'LIKE', '%' . $request->ville . '%');
            }

            // Limiter le nombre d'éléments par page (max 50)
            $perPage = min($request->get('per_page', 15), 50);
            
            $autoEcoles = $query->orderBy('nom_auto_ecole', 'asc')
                ->paginate($perPage);

            Log::info('Liste publique des auto-écoles consultée', [
                'total' => $autoEcoles->total(),
                'page' => $autoEcoles->currentPage(),
                'filters' => $request->only(['search', 'ville'])
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Liste des auto-écoles récupérée avec succès',
                'data' => AutoEcolePublicResource::collection($autoEcoles),
                'meta' => [
                    'current_page' => $autoEcoles->currentPage(),
                    'last_page' => $autoEcoles->lastPage(),
                    'per_page' => $autoEcoles->perPage(),
                    'total' => $autoEcoles->total(),
                    'from' => $autoEcoles->firstItem(),
                    'to' => $autoEcoles->lastItem(),
                ],
                'links' => [
                    'first' => $autoEcoles->url(1),
                    'last' => $autoEcoles->url($autoEcoles->lastPage()),
                    'prev' => $autoEcoles->previousPageUrl(),
                    'next' => $autoEcoles->nextPageUrl(),
                ]
            ]);

        } catch (Exception $e) {
            Log::error('Erreur lors de la récupération des auto-écoles publiques', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des auto-écoles.',
                'error' => config('app.debug') ? $e->getMessage() : 'Une erreur est survenue.'
            ], 500);
        }
    }

    /**
     * @OA\Post(
     *     path="/api/auto-ecoles",
     *     operationId="storeAutoEcole",
     *     tags={"🏫 Auto-Écoles"},
     *     summary="➕ Créer une auto-école",
     *     description="Crée une nouvelle auto-école",
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"nom_auto_ecole","email","responsable_id","contact"},
     *             @OA\Property(property="nom_auto_ecole", type="string", example="Auto-École Excellence"),
     *             @OA\Property(property="adresse", type="string", example="123 Avenue Principale"),
     *             @OA\Property(property="email", type="string", example="contact@excellence.com"),
     *             @OA\Property(property="responsable_id", type="string", format="uuid"),
     *             @OA\Property(property="contact", type="string", example="0612345678"),
     *             @OA\Property(property="statut", type="boolean", example=true)
     *         )
     *     ),
     *     @OA\Response(response=201, description="✅ Auto-école créée"),
     *     @OA\Response(response=422, description="❌ Erreur de validation")
     * )
     */
    #[Endpoint(operationId: 'createAutoEcole', title: 'Créer une auto-école', description: 'Crée une auto-école. Champs requis : `nom_auto_ecole`, `email`, `responsable_id`, `contact`. Optionnels : `adresse`, `statut`, `province_id`.')]
    #[ScrambleResponse(201, '`success`, `message`, `data` : AutoEcoleResource avec responsable.', type: 'array{success: bool, message: string, data: object}')]
    #[ScrambleResponse(422, 'Erreur de validation.', type: 'array{success: bool, message: string, errors: object}')]
    #[ScrambleResponse(500, 'Erreur serveur lors de la création.')]
    public function store(StoreAutoEcoleRequest $request): JsonResponse
    {
        try {
            DB::beginTransaction();

            $autoEcole = AutoEcole::create($request->validated());

            DB::commit();
            Cache::tags(['auto_ecoles'])->flush();

            Log::info('Auto-école créée', ['auto_ecole_id' => $autoEcole->id]);

            return response()->json([
                'success' => true,
                'message' => 'Auto-école créée avec succès.',
                'data' => new AutoEcoleResource($autoEcole->load('responsable'))
            ], 201);

        } catch (Exception $e) {
            DB::rollBack();

            Log::error('Erreur création auto-école', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création de l\'auto-école.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/auto-ecoles/{id}",
     *     operationId="getAutoEcole",
     *     tags={"🏫 Auto-Écoles"},
     *     summary="🔍 Détails d'une auto-école",
     *     description="Récupère les détails complets d'une auto-école",
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string")),
     *     @OA\Response(response=200, description="✅ Détails de l'auto-école"),
     *     @OA\Response(response=404, description="❌ Auto-école non trouvée")
     * )
     */
    #[Endpoint(operationId: 'getAutoEcole', title: 'Détail d\'une auto-école', description: 'Retourne une auto-école par UUID avec responsable, province, dossiers et formations.')]
    #[PathParameter('auto_ecole', description: 'Identifiant UUID de l\'auto-école.', type: 'string', format: 'uuid')]
    #[ScrambleResponse(200, '`success`, `data` : AutoEcoleResource complet.', type: 'array{success: bool, data: object}')]
    #[ScrambleResponse(404, 'Auto-école introuvable.', type: 'array{success: bool, message: string}')]
    public function show(string $id): JsonResponse
    {
        try {
            $autoEcole = Cache::tags(['auto_ecoles'])->remember("auto_ecoles:id:{$id}", 3600, function () use ($id) {
                return AutoEcole::with(['responsable','province', 'dossiers','formations'])->findOrFail($id);
            });

            return response()->json([
                'success' => true,
                'data' => new AutoEcoleResource($autoEcole)
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Auto-école non trouvée.'
            ], 404);
        }
    }

    /**
     * @OA\Put(
     *     path="/api/auto-ecoles/{id}",
     *     operationId="updateAutoEcole",
     *     tags={"🏫 Auto-Écoles"},
     *     summary="✏️ Mettre à jour une auto-école",
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string")),
     *     @OA\RequestBody(
     *         @OA\JsonContent(
     *             @OA\Property(property="nom_auto_ecole", type="string"),
     *             @OA\Property(property="adresse", type="string"),
     *             @OA\Property(property="contact", type="string"),
     *             @OA\Property(property="statut", type="boolean")
     *         )
     *     ),
     *     @OA\Response(response=200, description="✅ Auto-école mise à jour"),
     *     @OA\Response(response=404, description="❌ Auto-école non trouvée")
     * )
     */
    #[Endpoint(operationId: 'updateAutoEcole', title: 'Mettre à jour une auto-école', description: 'Met à jour partiellement ou totalement une auto-école (`nom_auto_ecole`, `adresse`, `email`, `contact`, `statut`, `province_id`, etc.).')]
    #[PathParameter('auto_ecole', description: 'Identifiant UUID de l\'auto-école.', type: 'string', format: 'uuid')]
    #[ScrambleResponse(200, '`success`, `message`, `data` : AutoEcoleResource mis à jour.', type: 'array{success: bool, message: string, data: object}')]
    #[ScrambleResponse(404, 'Auto-école introuvable.')]
    #[ScrambleResponse(422, 'Erreur de validation.')]
    public function update(UpdateAutoEcoleRequest $request, string $id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $autoEcole = AutoEcole::findOrFail($id);
            $autoEcole->update($request->validated());

            DB::commit();
            Cache::tags(['auto_ecoles'])->flush();

            Log::info('Auto-école mise à jour', ['auto_ecole_id' => $id]);

            return response()->json([
                'success' => true,
                'message' => 'Auto-école mise à jour avec succès.',
                'data' => new AutoEcoleResource($autoEcole->load('responsable'))
            ]);

        } catch (Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * @OA\Delete(
     *     path="/api/auto-ecoles/{id}",
     *     operationId="deleteAutoEcole",
     *     tags={"🏫 Auto-Écoles"},
     *     summary="🗑️ Supprimer une auto-école",
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string")),
     *     @OA\Response(response=200, description="✅ Auto-école supprimée"),
     *     @OA\Response(response=404, description="❌ Auto-école non trouvée")
     * )
     */
    #[Endpoint(operationId: 'deleteAutoEcole', title: 'Supprimer une auto-école', description: 'Suppression logique ou physique selon le modèle (soft delete si configuré).')]
    #[PathParameter('auto_ecole', description: 'Identifiant UUID de l\'auto-école.', type: 'string', format: 'uuid')]
    #[ScrambleResponse(200, '`success`, `message`.', type: 'array{success: bool, message: string}')]
    #[ScrambleResponse(404, 'Auto-école introuvable.')]
    public function destroy(string $id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $autoEcole = AutoEcole::findOrFail($id);
            $autoEcole->delete();

            DB::commit();
            Cache::tags(['auto_ecoles'])->flush();

            Log::info('Auto-école supprimée', ['auto_ecole_id' => $id]);

            return response()->json([
                'success' => true,
                'message' => 'Auto-école supprimée avec succès.'
            ]);

        } catch (Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/auto-ecoles/{id}/formations",
     *     operationId="getFormationsAutoEcole",
     *     tags={"🏫 Auto-Écoles"},
     *     summary="📚 Formations d'une auto-école",
     *     description="Récupère toutes les formations actives proposées par une auto-école",
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string")),
     *     @OA\Response(
     *         response=200,
     *         description="✅ Liste des formations",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="auto_ecole", type="object"),
     *             @OA\Property(property="formations", type="array", @OA\Items(type="object"))
     *         )
     *     ),
     *     @OA\Response(response=404, description="❌ Auto-école non trouvée")
     * )
     */
    #[Endpoint(
        operationId: 'listFormationsByAutoEcole',
        title: 'Formations d\'une auto-école',
        description: 'Liste paginée des formations **actives** (`statut=true`) pour l\'auto-école donnée, avec `typePermis` et `session`. Réponse : `auto_ecole`, `formations`, `total_formations`, `pagination`.'
    )]
    #[PathParameter('auto_ecole', description: 'Identifiant UUID de l\'auto-école.', type: 'string', format: 'uuid')]
    #[QueryParameter('per_page', description: 'Nombre de formations par page (1–100, défaut 15).', type: 'integer', required: false)]
    #[QueryParameter('page', description: 'Numéro de page (défaut 1).', type: 'integer', required: false)]
    #[ScrambleResponse(
        200,
        '`success`, `auto_ecole`, `formations` (FormationAutoEcoleResource), `total_formations`, `pagination` (current_page, last_page, per_page, total).',
        type: 'array{success: bool, auto_ecole: object, formations: array, total_formations: int, pagination: array{current_page: int, last_page: int, per_page: int, total: int}}'
    )]
    #[ScrambleResponse(404, 'Auto-école introuvable.', type: 'array{success: bool, message: string}')]
    public function formations(Request $request, string $id): JsonResponse
    {
        try {
            $autoEcole = AutoEcole::findOrFail($id);

            $paginator = FormationAutoEcole::where('auto_ecole_id', $id)
                ->where('statut', true)
                ->with(['typePermis', 'session'])
                ->paginate($this->perPage($request));

            return response()->json([
                'success' => true,
                'auto_ecole' => new AutoEcoleResource($autoEcole),
                'formations' => FormationAutoEcoleResource::collection($paginator->items()),
                'total_formations' => $paginator->total(),
                'pagination' => [
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                ],
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Auto-école non trouvée.'
            ], 404);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/auto-ecoles/mes-dossiers",
     *     operationId="mesDossiersAutoEcole",
     *     tags={"🏫 Auto-Écoles"},
     *     summary="📁 Dossiers de mon auto-école",
     *     description="Récupère tous les dossiers de l'auto-école du responsable connecté. Si l'utilisateur a un centre_id (agent), seuls les dossiers de son centre sont retournés.",
     *     security={{"BearerAuth":{}}},
     *     @OA\Parameter(name="statut", in="query", @OA\Schema(type="string")),
     *     @OA\Response(
     *         response=200,
     *         description="✅ Liste des dossiers",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="auto_ecole", type="object"),
     *             @OA\Property(property="dossiers", type="array", @OA\Items(type="object")),
     *             @OA\Property(property="statistiques", type="object")
     *         )
     *     ),
     *     @OA\Response(response=400, description="❌ Pas d'auto-école associée"),
     *     @OA\Response(response=401, description="❌ Non authentifié")
     * )
     */
    #[Endpoint(
        operationId: 'mesDossiersAutoEcole',
        title: 'Dossiers de mon auto-école',
        description: 'Liste paginée des dossiers de l\'auto-école dont l\'utilisateur connecté est **responsable**. Filtre optionnel `statut`. Si l\'utilisateur a un `centre_id` (agent), seuls les dossiers de ce centre sont visibles. Compteurs dans `statistiques` : `total`, `en_attente`, `en_cours`, `valide`, `rejete`.'
    )]
    #[QueryParameter('statut', description: 'Filtrer par libellé de statut du dossier (égalité stricte, ex. `en_attente`).', type: 'string', required: false)]
    #[QueryParameter('per_page', description: 'Nombre de dossiers par page (1–100, défaut 15).', type: 'integer', required: false)]
    #[QueryParameter('page', description: 'Numéro de page (défaut 1).', type: 'integer', required: false)]
    #[ScrambleResponse(
        200,
        '`success`, `auto_ecole`, `dossiers` (page courante), `pagination`, `statistiques`.',
        type: 'array{success: bool, auto_ecole: object, dossiers: array, pagination: array{current_page: int, last_page: int, per_page: int, total: int}, statistiques: array{total: int, en_attente: int, en_cours: int, valide: int, rejete: int}}'
    )]
    #[ScrambleResponse(400, 'Aucune auto-école liée au compte.', type: 'array{success: bool, message: string}')]
    #[ScrambleResponse(404, 'Utilisateur ou personne introuvable.', type: 'array{success: bool, message: string}')]
    public function mesDossiers(Request $request): JsonResponse
    {
        try {
            // Récupérer l'auto-école du responsable connecté
            $user = AuthHelper::getAuthenticatedUser($request);

            if (!$user || !$user->personne) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur non trouvé.'
                ], 404);
            }

            // Récupérer l'auto-école dont l'utilisateur est responsable
            $autoEcole = AutoEcole::where('responsable_id', $user->personne->id)->first();

            if (!$autoEcole) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune auto-école associée à votre compte.'
                ], 400);
            }

            $listQuery = Dossier::where('auto_ecole_id', $autoEcole->id)
                ->with(['candidat.personne', 'formation.typePermis', 'documents']);

            \App\Http\Helpers\CentreScopeHelper::applyCentreScopeToDossiersQuery($listQuery);

            if ($request->has('statut')) {
                $listQuery->where('statut', $request->statut);
            }

            $perPage = $this->perPage($request);
            $paginator = $listQuery->latest()->paginate($perPage);

            $statsQuery = Dossier::where('auto_ecole_id', $autoEcole->id);
            \App\Http\Helpers\CentreScopeHelper::applyCentreScopeToDossiersQuery($statsQuery);
            if ($request->has('statut')) {
                $statsQuery->where('statut', $request->statut);
            }

            $statistiques = [
                'total' => (clone $statsQuery)->count(),
                'en_attente' => (clone $statsQuery)->where('statut', 'en_attente')->count(),
                'en_cours' => (clone $statsQuery)->where('statut', 'en_cours')->count(),
                'valide' => (clone $statsQuery)->where('statut', 'valide')->count(),
                'rejete' => (clone $statsQuery)->where('statut', 'rejete')->count(),
            ];

            Log::info('Consultation dossiers auto-école', [
                'auto_ecole_id' => $autoEcole->id,
                'total_dossiers' => $statistiques['total']
            ]);

            return response()->json([
                'success' => true,
                'auto_ecole' => new AutoEcoleResource($autoEcole),
                'dossiers' => DossierResource::collection($paginator->items()),
                'pagination' => [
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                ],
                'statistiques' => $statistiques
            ]);

        } catch (Exception $e) {
            Log::error('Erreur récupération dossiers auto-école', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des dossiers.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Relations chargées pour AutoEcoleCompletResource (sans dossiers).
     *
     * @return array<string, mixed>
     */
    private function autoEcoleCompletRelations(): array
    {
        return [
            'responsable',
            'province.parent',
            'province.children',
            'formations' => function ($formationsQuery) {
                $formationsQuery->with([
                    'typePermis.parent',
                    'typePermis.children',
                    'session.parent',
                    'session.children',
                ]);
            },
        ];
    }
}

