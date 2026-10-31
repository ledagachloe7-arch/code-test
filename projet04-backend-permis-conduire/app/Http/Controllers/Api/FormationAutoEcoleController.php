<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\FormationAutoEcole\StoreFormationAutoEcoleRequest;
use App\Http\Requests\FormationAutoEcole\UpdateFormationAutoEcoleRequest;
use App\Http\Resources\FormationAutoEcoleResource;
use App\Http\Resources\ReferentielResource;
use App\Models\FormationAutoEcole;
use App\Models\PieceJustificative;
use App\Models\Referentiel;
use Dedoc\Scramble\Attributes\Endpoint;
use Dedoc\Scramble\Attributes\Group;
use Dedoc\Scramble\Attributes\PathParameter;
use Dedoc\Scramble\Attributes\QueryParameter;
use Dedoc\Scramble\Attributes\Response as ScrambleResponse;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
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
 *     name="📚 Formations",
 *     description="Gestion des formations auto-école"
 * )
 */
#[Group('Formations auto-école', description: 'Gestion des formations par auto-école (type_permis, montant, session). CRUD et liste avec filtres.')]
class FormationAutoEcoleController extends Controller
{
    /**
     * Liste paginée des formations avec autoEcole, typePermis, session. Filtres : auto_ecole_id, statut.
     *
     * @OA\Get(
     *     path="/api/formations",
     *     operationId="getFormations",
     *     tags={"📚 Formations"},
     *     summary="📋 Liste des formations",
     *     @OA\Parameter(name="auto_ecole_id", in="query", @OA\Schema(type="string")),
     *     @OA\Parameter(name="statut", in="query", @OA\Schema(type="boolean")),
     *     @OA\Response(response=200, description="✅ Liste des formations")
     * )
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = FormationAutoEcole::with(['autoEcole', 'typePermis', 'session']);

        if ($request->has('auto_ecole_id')) {
            $query->where('auto_ecole_id', $request->auto_ecole_id);
        }

        if ($request->has('statut')) {
            $query->where('statut', $request->boolean('statut'));
        }

        $formations = $query->latest()->paginate($request->get('per_page', 15));

        return FormationAutoEcoleResource::collection($formations);
    }

    /**
     * @OA\Post(
     *     path="/api/formations",
     *     operationId="storeFormation",
     *     tags={"📚 Formations"},
     *     summary="➕ Créer une formation",
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"auto_ecole_id","type_permis_id","montant","session_id"},
     *             @OA\Property(property="auto_ecole_id", type="string", format="uuid"),
     *             @OA\Property(property="type_permis_id", type="string", format="uuid"),
     *             @OA\Property(property="montant", type="number", format="float", example=250000),
     *             @OA\Property(property="description", type="string"),
     *             @OA\Property(property="session_id", type="string", format="uuid"),
     *             @OA\Property(property="statut", type="boolean", example=true)
     *         )
     *     ),
     *     @OA\Response(response=201, description="✅ Formation créée"),
     *     @OA\Response(response=422, description="❌ Erreur de validation")
     * )
     */
    public function store(StoreFormationAutoEcoleRequest $request): JsonResponse
    {
        try {
            DB::beginTransaction();

            $formation = FormationAutoEcole::create($request->validated());

            DB::commit();

            Log::info('Formation créée', ['formation_id' => $formation->id]);

            return response()->json([
                'success' => true,
                'message' => 'Formation créée avec succès.',
                'data' => new FormationAutoEcoleResource($formation->load(['autoEcole', 'typePermis', 'session']))
            ], 201);

        } catch (Exception $e) {
            DB::rollBack();

            Log::error('Erreur création formation', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création de la formation.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/formations/{id}",
     *     operationId="getFormation",
     *     tags={"📚 Formations"},
     *     summary="🔍 Détails d'une formation",
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string")),
     *     @OA\Response(response=200, description="✅ Détails de la formation"),
     *     @OA\Response(response=404, description="❌ Formation non trouvée")
     * )
     */
    public function show(string $id): JsonResponse
    {
        try {
            $formation = FormationAutoEcole::with(['autoEcole', 'typePermis', 'session', 'dossiers'])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => new FormationAutoEcoleResource($formation)
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Formation non trouvée.'
            ], 404);
        }
    }

    /**
     * @OA\Put(
     *     path="/api/formations/{id}",
     *     operationId="updateFormation",
     *     tags={"📚 Formations"},
     *     summary="✏️ Mettre à jour une formation",
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string")),
     *     @OA\RequestBody(
     *         @OA\JsonContent(
     *             @OA\Property(property="montant", type="number"),
     *             @OA\Property(property="description", type="string"),
     *             @OA\Property(property="statut", type="boolean")
     *         )
     *     ),
     *     @OA\Response(response=200, description="✅ Formation mise à jour")
     * )
     */
    public function update(UpdateFormationAutoEcoleRequest $request, string $id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $formation = FormationAutoEcole::findOrFail($id);
            $formation->update($request->validated());

            DB::commit();

            Log::info('Formation mise à jour', ['formation_id' => $id]);

            return response()->json([
                'success' => true,
                'message' => 'Formation mise à jour avec succès.',
                'data' => new FormationAutoEcoleResource($formation->load(['autoEcole', 'typePermis', 'session']))
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
     *     path="/api/formations/{id}",
     *     operationId="deleteFormation",
     *     tags={"📚 Formations"},
     *     summary="🗑️ Supprimer une formation",
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string")),
     *     @OA\Response(response=200, description="✅ Formation supprimée")
     * )
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $formation = FormationAutoEcole::findOrFail($id);
            $formation->delete();

            DB::commit();

            Log::info('Formation supprimée', ['formation_id' => $id]);

            return response()->json([
                'success' => true,
                'message' => 'Formation supprimée avec succès.'
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
     *     path="/api/formations/{id}/documents-requis",
     *     operationId="getDocumentsRequis",
     *     tags={"📚 Formations"},
     *     summary="📋 Documents requis pour une formation",
     *     description="Liste tous les documents obligatoires pour s'inscrire à cette formation",
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string")),
     *     @OA\Response(
     *         response=200,
     *         description="✅ Liste des documents requis",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="formation", type="object"),
     *             @OA\Property(property="documents_requis", type="array", @OA\Items(type="object"))
     *         )
     *     ),
     *     @OA\Response(response=404, description="❌ Formation non trouvée")
     * )
     */
    #[Endpoint(title: 'Documents requis pour une formation', description: 'Liste paginée des pièces justificatives obligatoires pour le type de permis de la formation.')]
    #[PathParameter('formation', description: 'ID (UUID) de la formation auto-école', type: 'string', format: 'uuid')]
    #[QueryParameter('per_page', description: 'Nombre d\'éléments par page (1-100, défaut 15)', type: 'integer', required: false)]
    #[QueryParameter('page', description: 'Numéro de page', type: 'integer', required: false)]
    #[ScrambleResponse(200, 'success, formation, documents_requis, total_documents, pagination.')]
    #[ScrambleResponse(404, 'Formation non trouvée.')]
    public function documentsRequis(Request $request, string $id): JsonResponse
    {
        try {
            $formation = FormationAutoEcole::with(['typePermis', 'session'])->findOrFail($id);

            $paginator = PieceJustificative::where('type_permis_id', $formation->type_permis_id)
                ->where('obligatoire', true)
                ->with('typeDocument')
                ->paginate($this->perPage($request));

            $documentsRequis = collect($paginator->items())->map(function ($piece) {
                return [
                    'id' => $piece->id,
                    'type_document' => new ReferentielResource($piece->typeDocument),
                    'obligatoire' => $piece->obligatoire,
                    'is_national' => $piece->is_national,
                ];
            })->values();

            return response()->json([
                'success' => true,
                'formation' => new FormationAutoEcoleResource($formation),
                'documents_requis' => $documentsRequis,
                'total_documents' => $paginator->total(),
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
                'message' => 'Formation non trouvée.'
            ], 404);
        }
    }
}

