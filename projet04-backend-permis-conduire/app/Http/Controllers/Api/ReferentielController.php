<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Referentiel\LinkCentreProvinceRequest;
use App\Http\Requests\Referentiel\StoreReferentielRequest;
use App\Http\Requests\Referentiel\UpdateReferentielRequest;
use Dedoc\Scramble\Attributes\Endpoint;
use Dedoc\Scramble\Attributes\Group;
use Dedoc\Scramble\Attributes\QueryParameter;
use Dedoc\Scramble\Attributes\Response as ScrambleResponse;
use App\Http\Resources\ReferentielResource;
use App\Models\Referentiel;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

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
 *     name="📖 Référentiels",
 *     description="Gestion des données de référence (types de permis, sessions, etc.)"
 * )
 */
#[Group('Référentiels', description: 'Gestion des données de référence (type_ref, statut). Hiérarchie via parent_id (FK vers la même table). Inclut centres, provinces, type_demande, type_permis.')]
class ReferentielController extends Controller
{
    /**
     * Retourne la liste paginée des référentiels. Permet de filtrer par type (type_ref),
     * par statut actif/inactif, et par pagination (per_page).
     *
     * @OA\Get(
     *     path="/api/referentiels",
     *     operationId="getReferentiels",
     *     tags={"📖 Référentiels"},
     *     summary="📋 Liste des référentiels",
     *     @OA\Parameter(name="type_ref", in="query", @OA\Schema(type="string"), description="Type de référentiel"),
     *     @OA\Parameter(name="statut", in="query", @OA\Schema(type="boolean")),
     *     @OA\Response(response=200, description="✅ Liste des référentiels")
     * )
     */
    #[Endpoint(title: 'Liste des référentiels', description: 'Retourne la liste paginée des référentiels. Permet de filtrer par type (type_ref), par statut actif/inactif, et par pagination (per_page).')]
    #[QueryParameter('type_ref', description: 'Filtrer par type de référentiel (ex. type_permis, centre, province).', type: 'string', required: false)]
    #[QueryParameter('statut', description: 'Filtrer par statut actif (true) ou inactif (false).', type: 'boolean', required: false)]
    #[QueryParameter('per_page', description: 'Nombre d\'éléments par page (défaut 15).', type: 'integer', required: false)]
    #[ScrambleResponse(200, 'Liste paginée des référentiels avec id, libelle, code, type_ref, description, statut, montant, type_demande, type_permis, parent_id ; parent et children présents si chargés.')]
    public function index(Request $request): AnonymousResourceCollection
    {
        $cacheKey = 'referentiels:' . md5(json_encode($request->all()));
        $referentiels = Cache::tags(['referentiels'])->remember($cacheKey, 3600, function () use ($request) {
            $query = Referentiel::query();

            if ($request->has('type_ref')) {
                $query->where('type_ref', $request->type_ref);
            }

            if ($request->has('statut')) {
                $query->where('statut', $request->boolean('statut'));
            }

            return $query->orderBy('type_ref')->orderBy('libelle')->paginate($request->get('per_page', 15));
        });

        return ReferentielResource::collection($referentiels);
    }

    /**
     * Crée un nouveau référentiel. Champs obligatoires : libelle, code, type_ref.
     * Les champs type_demande, type_permis et parent_id sont des UUID optionnels pointant vers d'autres référentiels (hiérarchie et liaisons).
     *
     * @OA\Post(
     *     path="/api/referentiels",
     *     operationId="storeReferentiel",
     *     tags={"📖 Référentiels"},
     *     summary="➕ Créer un référentiel",
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"libelle","code","type_ref"},
     *             @OA\Property(property="libelle", type="string", example="Permis B"),
     *             @OA\Property(property="code", type="string", example="B"),
     *             @OA\Property(property="type_ref", type="string", example="type_permis"),
     *             @OA\Property(property="description", type="string"),
     *             @OA\Property(property="statut", type="boolean", example=true),
     *             @OA\Property(property="parent_id", type="string", format="uuid", nullable=true, description="UUID du référentiel parent (hiérarchie)")
     *         )
     *     ),
     *     @OA\Response(response=201, description="✅ Référentiel créé")
     * )
     */
    /**
     * Enregistre l'association d'un centre à une province (centre.parent_id = province.id).
     * Body : centre_id (UUID d'un référentiel type_ref=centre), province_id (UUID d'un référentiel type_ref=province).
     */
    #[Endpoint(title: 'Lier un centre à une province', description: 'Enregistre l\'association centre–province : le centre (type_ref=centre) a son parent_id mis à jour avec l\'ID de la province (type_ref=province). Body : centre_id, province_id (UUID).')]
    #[ScrambleResponse(200, 'Association enregistrée. Retourne success, message et data (référentiel centre mis à jour avec parent_id).')]
    #[ScrambleResponse(422, 'Données invalides (centre_id ou province_id absent / inexistant / mauvais type_ref).', type: 'array{success: bool, message: string, errors: object}')]
    #[ScrambleResponse(500, 'Erreur serveur.')]
    public function linkCentreProvince(LinkCentreProvinceRequest $request): JsonResponse
    {
        try {
            $centre = Referentiel::where('id', $request->centre_id)->where('type_ref', 'centre')->firstOrFail();
            $province = Referentiel::where('id', $request->province_id)->where('type_ref', 'province')->firstOrFail();

            $centre->update(['parent_id' => $province->id]);

            Log::info('Centre lié à la province', [
                'centre_id' => $centre->id,
                'centre_libelle' => $centre->libelle,
                'province_id' => $province->id,
                'province_libelle' => $province->libelle,
            ]);

            $centre->load('parent');
            Cache::tags(['referentiels'])->flush();

            return response()->json([
                'success' => true,
                'message' => 'Centre associé à la province avec succès.',
                'data' => new ReferentielResource($centre),
            ]);
        } catch (Exception $e) {
            Log::error('Erreur liaison centre–province', [
                'centre_id' => $request->centre_id,
                'province_id' => $request->province_id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'enregistrement de l\'association.',
            ], 500);
        }
    }

    #[Endpoint(title: 'Créer un référentiel', description: 'Crée un nouveau référentiel. Champs obligatoires : libelle, code, type_ref. Les champs type_demande, type_permis et parent_id sont des UUID optionnels pointant vers d\'autres référentiels (hiérarchie et liaisons).')]
    #[ScrambleResponse(201, 'Référentiel créé. Retourne success, message et data (objet référentiel avec id, libelle, code, type_ref, description, statut, montant, type_demande, type_permis, parent_id).')]
    #[ScrambleResponse(422, 'Erreur de validation (libelle, code, type_ref requis ; code unique ; parent_id doit exister et être un UUID valide).', type: 'array{success: bool, message: string, errors: object}')]
    #[ScrambleResponse(500, 'Erreur serveur lors de la création.')]
    public function store(StoreReferentielRequest $request): JsonResponse
    {

        try {
            DB::beginTransaction();
           
            $data = $request->validated();

            // Sécurisation métier des FK
            $data['type_demande'] = !empty($data['type_demande'])
                ? Referentiel::where('id', $data['type_demande'])->value('id')
                : null;

            $data['type_permis'] = !empty($data['type_permis'])
                ? Referentiel::where('id', $data['type_permis'])->value('id')
                : null;

            $data['parent_id'] = !empty($data['parent_id'])
                ? Referentiel::where('id', $data['parent_id'])->value('id')
                : null;

            $referentiel = Referentiel::create($data);

            DB::commit();
            Cache::tags(['referentiels'])->flush();

            return response()->json([
                'success' => true,
                'message' => 'Référentiel créé avec succès.',
                'data' => new ReferentielResource($referentiel)
            ], 201);

        } catch (Exception $e) {
            DB::rollBack();

            Log::error('Erreur création référentiel', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création du référentiel.',
            ], 500);
        }
    }

    /**
     * Récupère le détail d'un référentiel par son ID (UUID). Inclut les relations parent et children (hiérarchie)
     * ainsi que typeDemande et typePermis si définis.
     *
     * @OA\Get(
     *     path="/api/referentiels/{id}",
     *     operationId="getReferentiel",
     *     tags={"📖 Référentiels"},
     *     summary="🔍 Détails d'un référentiel",
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string")),
     *     @OA\Response(response=200, description="✅ Détails du référentiel")
     * )
     */
    #[Endpoint(title: 'Détail d\'un référentiel', description: 'Récupère le détail d\'un référentiel par son ID (UUID). Inclut les relations parent et children (hiérarchie) ainsi que typeDemande et typePermis si définis.')]
    #[ScrambleResponse(200, 'Détail du référentiel avec id, libelle, code, type_ref, description, statut, montant, type_demande, type_permis, parent_id, parent (objet si chargé), children (liste si chargée).')]
    #[ScrambleResponse(404, 'Référentiel non trouvé.', type: 'array{success: bool, message: string}')]
    public function show(string $id): JsonResponse
    {
        try {
            $referentiel = Referentiel::with(['typeDemande', 'typePermis', 'parent', 'children'])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => new ReferentielResource($referentiel)
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Référentiel non trouvé.'
            ], 404);
        }
    }

    /**
     * Met à jour un référentiel existant. Tous les champs sont optionnels (patch).
     * parent_id ne peut pas être l'ID du référentiel lui-même (pas d'auto-référence).
     *
     * @OA\Put(
     *     path="/api/referentiels/{id}",
     *     operationId="updateReferentiel",
     *     tags={"📖 Référentiels"},
     *     summary="✏️ Mettre à jour un référentiel",
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string")),
     *     @OA\RequestBody(
     *         @OA\JsonContent(
     *             @OA\Property(property="libelle", type="string"),
     *             @OA\Property(property="description", type="string"),
     *             @OA\Property(property="statut", type="boolean"),
     *             @OA\Property(property="parent_id", type="string", format="uuid", nullable=true, description="UUID du référentiel parent (hiérarchie)")
     *         )
     *     ),
     *     @OA\Response(response=200, description="✅ Référentiel mis à jour")
     * )
     */
    #[Endpoint(title: 'Mettre à jour un référentiel', description: 'Met à jour un référentiel existant. Tous les champs sont optionnels (patch). parent_id ne peut pas être l\'ID du référentiel lui-même (pas d\'auto-référence).')]
    #[ScrambleResponse(200, 'Référentiel mis à jour. Retourne success, message et data (référentiel mis à jour avec parent_id, parent, children si chargés).')]
    #[ScrambleResponse(404, 'Référentiel non trouvé.')]
    #[ScrambleResponse(422, 'Erreur de validation (ex. parent_id égal à l\'id du référentiel).', type: 'array{success: bool, message: string, errors: object}')]
    #[ScrambleResponse(500, 'Erreur serveur lors de la mise à jour.')]
    public function update(UpdateReferentielRequest $request, string $id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $referentiel = Referentiel::with(['typeDemande', 'typePermis', 'parent', 'children'])->findOrFail($id);
            $referentiel->update($request->validated());

            DB::commit();
            Cache::tags(['referentiels'])->flush();

            Log::info('Référentiel mis à jour', ['referentiel_id' => $id]);

            return response()->json([
                'success' => true,
                'message' => 'Référentiel mis à jour avec succès.',
                'data' => new ReferentielResource($referentiel)
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
     * Supprime définitivement un référentiel. Les référentiels enfants conservent leur parent_id
     * (mise à null par la FK nullOnDelete selon la migration).
     *
     * @OA\Delete(
     *     path="/api/referentiels/{id}",
     *     operationId="deleteReferentiel",
     *     tags={"📖 Référentiels"},
     *     summary="🗑️ Supprimer un référentiel",
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string")),
     *     @OA\Response(response=200, description="✅ Référentiel supprimé")
     * )
     */
    #[Endpoint(title: 'Supprimer un référentiel', description: 'Supprime définitivement un référentiel. Les référentiels enfants conservent leur parent_id (mise à null par la FK nullOnDelete selon la migration).')]
    #[ScrambleResponse(200, 'Référentiel supprimé. Retourne success et message.')]
    #[ScrambleResponse(404, 'Référentiel non trouvé.')]
    #[ScrambleResponse(500, 'Erreur serveur lors de la suppression.')]
    public function destroy(string $id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $referentiel = Referentiel::with(['typeDemande', 'typePermis', 'parent', 'children'])->findOrFail($id);
            $referentiel->delete();

            DB::commit();
            Cache::tags(['referentiels'])->flush();

            Log::info('Référentiel supprimé', ['referentiel_id' => $id]);

            return response()->json([
                'success' => true,
                'message' => 'Référentiel supprimé avec succès.'
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
}

