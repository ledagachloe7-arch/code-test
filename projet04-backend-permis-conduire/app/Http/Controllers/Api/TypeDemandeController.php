<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\TypeDemande\StoreTypeDemandeRequest;
use App\Http\Requests\TypeDemande\UpdateTypeDemandeRequest;
use Dedoc\Scramble\Attributes\Group;
use Dedoc\Scramble\Attributes\Response as ScrambleResponse;
use App\Http\Resources\TypeDemandeResource;
use App\Models\TypeDemande;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * @OA\Tag(
 *     name="📋 Types de Demandes",
 *     description="Gestion des types de demandes"
 * )
 * 
 * @OA\Schema(
 *     schema="TypeDemandeResource",
 *     type="object",
 *     @OA\Property(property="id", type="string", format="uuid", example="019a0e34-d153-7330-8cb6-80b14fd8811c"),
 *     @OA\Property(property="name", type="string", example="Permis de conduire"),
 *     @OA\Property(property="created_at", type="string", format="date-time", example="2025-12-09T10:38:39+00:00"),
 *     @OA\Property(property="updated_at", type="string", format="date-time", example="2025-12-09T10:38:39+00:00")
 * )
 */
#[Group('Types de demandes', description: 'CRUD des types de demandes (ex. Permis de conduire).')]
class TypeDemandeController extends Controller
{
    /**
     * Liste paginée des types de demandes (ex. Permis de conduire). Paramètre optionnel : per_page.
     *
     * @OA\Get(
     *     path="/api/type-demandes",
     *     operationId="getTypeDemandes",
     *     tags={"📋 Types de Demandes"},
     *     summary="📋 Liste des types de demandes",
     *     description="Récupère la liste de tous les types de demandes",
     *     security={{"BearerAuth":{}}},
     *     @OA\Parameter(
     *         name="per_page",
     *         in="query",
     *         description="Nombre d'éléments par page",
     *         required=false,
     *         @OA\Schema(type="integer", default=15)
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="✅ Liste des types de demandes",
     *         @OA\JsonContent(
     *             @OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/TypeDemandeResource"))
     *         )
     *     )
     * )
     */
    #[ScrambleResponse(200, 'Liste paginée des types de demandes (id, name, created_at, updated_at).')]
    public function index(): AnonymousResourceCollection
    {
        $typeDemandes = TypeDemande::latest()->paginate(request()->get('per_page', 15));

        return TypeDemandeResource::collection($typeDemandes);
    }

    /**
     * Crée un type de demande. Body : name (obligatoire).
     *
     * @OA\Post(
     *     path="/api/type-demandes",
     *     operationId="storeTypeDemande",
     *     tags={"📋 Types de Demandes"},
     *     summary="➕ Créer un type de demande",
     *     description="Crée un nouveau type de demande",
     *     security={{"BearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"name"},
     *             @OA\Property(property="name", type="string", example="Permis de conduire", description="Nom du type de demande")
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="✅ Type de demande créé avec succès",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Type de demande créé avec succès."),
     *             @OA\Property(property="data", ref="#/components/schemas/TypeDemandeResource")
     *         )
     *     ),
     *     @OA\Response(response=422, description="❌ Erreur de validation")
     * )
     */
    #[ScrambleResponse(201, 'Type de demande créé. Retourne success, message, data (id, name, created_at, updated_at).')]
    #[ScrambleResponse(422, 'Erreur de validation (name requis).')]
    public function store(StoreTypeDemandeRequest $request): JsonResponse
    {
        try {
            DB::beginTransaction();

            $typeDemande = TypeDemande::create($request->validated());

            DB::commit();

            Log::info('Type de demande créé', ['type_demande_id' => $typeDemande->id]);

            return response()->json([
                'success' => true,
                'message' => 'Type de demande créé avec succès.',
                'data' => new TypeDemandeResource($typeDemande)
            ], 201);
        } catch (Exception $e) {
            DB::rollBack();

            Log::error('Erreur création type de demande', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création du type de demande.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/type-demandes/{id}",
     *     operationId="getTypeDemande",
     *     tags={"📋 Types de Demandes"},
     *     summary="🔍 Détails d'un type de demande",
     *     description="Récupère les détails d'un type de demande spécifique",
     *     security={{"BearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="UUID du type de demande",
     *         @OA\Schema(type="string", format="uuid")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="✅ Détails du type de demande",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="data", ref="#/components/schemas/TypeDemandeResource")
     *         )
     *     ),
     *     @OA\Response(response=404, description="❌ Type de demande non trouvé")
     * )
     */
    public function show(string $id): JsonResponse
    {
        try {
            $typeDemande = TypeDemande::findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => new TypeDemandeResource($typeDemande)
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Type de demande non trouvé.'
            ], 404);
        }
    }

    /**
     * @OA\Put(
     *     path="/api/type-demandes/{id}",
     *     operationId="updateTypeDemande",
     *     tags={"📋 Types de Demandes"},
     *     summary="✏️ Mettre à jour un type de demande",
     *     description="Met à jour un type de demande existant",
     *     security={{"BearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="UUID du type de demande",
     *         @OA\Schema(type="string", format="uuid")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"name"},
     *             @OA\Property(property="name", type="string", example="Permis de conduire", description="Nom du type de demande")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="✅ Type de demande mis à jour avec succès",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Type de demande mis à jour avec succès."),
     *             @OA\Property(property="data", ref="#/components/schemas/TypeDemandeResource")
     *         )
     *     ),
     *     @OA\Response(response=404, description="❌ Type de demande non trouvé"),
     *     @OA\Response(response=422, description="❌ Erreur de validation")
     * )
     */
    public function update(UpdateTypeDemandeRequest $request, string $id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $typeDemande = TypeDemande::findOrFail($id);
            $typeDemande->update($request->validated());

            DB::commit();

            Log::info('Type de demande mis à jour', ['type_demande_id' => $id]);

            return response()->json([
                'success' => true,
                'message' => 'Type de demande mis à jour avec succès.',
                'data' => new TypeDemandeResource($typeDemande->fresh())
            ]);
        } catch (Exception $e) {
            DB::rollBack();

            Log::error('Erreur mise à jour type de demande', [
                'type_demande_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour du type de demande.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * @OA\Delete(
     *     path="/api/type-demandes/{id}",
     *     operationId="deleteTypeDemande",
     *     tags={"📋 Types de Demandes"},
     *     summary="🗑️ Supprimer un type de demande",
     *     description="Supprime un type de demande",
     *     security={{"BearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="UUID du type de demande",
     *         @OA\Schema(type="string", format="uuid")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="✅ Type de demande supprimé avec succès",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Type de demande supprimé avec succès.")
     *         )
     *     ),
     *     @OA\Response(response=404, description="❌ Type de demande non trouvé")
     * )
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $typeDemande = TypeDemande::findOrFail($id);
            $typeDemande->delete();

            DB::commit();

            Log::info('Type de demande supprimé', ['type_demande_id' => $id]);

            return response()->json([
                'success' => true,
                'message' => 'Type de demande supprimé avec succès.'
            ]);
        } catch (Exception $e) {
            DB::rollBack();

            Log::error('Erreur suppression type de demande', [
                'type_demande_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression du type de demande.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }
}
