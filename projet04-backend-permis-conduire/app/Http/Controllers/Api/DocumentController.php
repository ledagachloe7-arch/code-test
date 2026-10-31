<?php

namespace App\Http\Controllers\Api;

use App\Models\Dossier;
use Exception;
use App\Models\Document;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\Controller;
use App\Http\Resources\DocumentResource;
use App\Http\Requests\Document\StoreDocumentRequest;
use App\Http\Requests\Document\UpdateDocumentRequest;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use App\Services\MinioService;
use App\Http\Helpers\AuthHelper;
use App\Http\Helpers\CentreScopeHelper;
use App\Models\Candidat;
use App\Models\Referentiel;
use App\Models\TypeDemande;
use Dedoc\Scramble\Attributes\Endpoint;
use Dedoc\Scramble\Attributes\Group;
use Dedoc\Scramble\Attributes\QueryParameter;
use Dedoc\Scramble\Attributes\Response as ScrambleResponse;

/**
 * @OA\Tag(
 *     name="📄 Documents",
 *     description="Gestion des documents"
 * )
 */
#[Group('Documents', description: 'Gestion des documents. Restriction centre : un agent avec centre_id ne voit que les documents liés aux dossiers de son centre (liste, détail, modification, suppression).')]
class DocumentController extends Controller
{
    /**
     * Liste paginée des documents. Filtres : model_id (documentable_id), documentable_type. Agents avec centre_id : uniquement les documents des dossiers de leur centre.
     *
     * @OA\Get(
     *     path="/api/documents",
     *     operationId="getDocuments",
     *     tags={"📄 Documents"},
     *     summary="📋 Liste des documents",
     *     @OA\Parameter(name="documentable_id", in="query", @OA\Schema(type="string")),
     *     @OA\Parameter(name="documentable_type", in="query", @OA\Schema(type="string", enum={"App\\Models\\Dossier","App\\Models\\Candidat"})),
     *     @OA\Response(response=200, description="✅ Liste des documents")
     * )
     */
    protected $minioService;
    public function __construct(MinioService $minioService)
    {
        $this->minioService = $minioService;
    }

    #[Endpoint(title: 'Liste des documents', description: 'Liste paginée des documents. Filtres : model_id (documentable_id), documentable_type. Les agents avec centre_id ne voient que les documents liés aux dossiers de leur centre.')]
    #[QueryParameter('model_id', description: 'Filtrer par ID du modèle lié (documentable_id)', type: 'string', format: 'uuid', required: false)]
    #[QueryParameter('documentable_type', description: 'Filtrer par type (Dossier, Candidat, etc.)', type: 'string', required: false)]
    #[QueryParameter('per_page', description: 'Nombre d\'éléments par page', type: 'integer', required: false)]
    #[ScrambleResponse(200, 'Liste paginée des documents avec documentable et typeDocument. 403 si agent centre et document d\'un dossier d\'un autre centre.')]
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Document::with(['documentable', 'typeDocument']);

        // Filtrage par id du model
        if ($request->has('model_id')) {
            $query->where('documentable_id', $request->model_id);
        }

        // Filtrage par documentable_type
        if ($request->has('documentable_type')) {
            $query->where('documentable_type', $request->documentable_type);
        }

        // Restriction centre : un agent avec centre_id ne voit que les documents des dossiers de son centre
        $user = auth()->user();
        if ($user && $user->isAgentWithCentre()) {
            $query->where(function ($q) use ($user) {
                $q->where('documentable_type', '!=', Dossier::class)
                    ->orWhereIn('documentable_id', Dossier::where('centre_id', $user->centre_id)->pluck('id'));
            });
        }

        $documents = $query->latest()->paginate($request->get('per_page', 15));

        return DocumentResource::collection($documents);
    }

    /**
     * @OA\Post(
     *     path="/api/documents",
     *     operationId="storeDocument",
     *     tags={"📄 Documents"},
     *     summary="➕ Créer un document",
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"documentable_id","documentable_type","nom_fichier","chemin_fichier","type_mime","taille_fichier"},
     *             @OA\Property(property="documentable_id", type="string", format="uuid"),
     *             @OA\Property(property="documentable_type", type="string", enum={"App\\Models\\Dossier","App\\Models\\Candidat"}),
     *             @OA\Property(property="type_document_id", type="string", format="uuid"),
     *             @OA\Property(property="nom_fichier", type="string"),
     *             @OA\Property(property="chemin_fichier", type="string"),
     *             @OA\Property(property="type_mime", type="string"),
     *             @OA\Property(property="taille_fichier", type="integer"),
     *             @OA\Property(property="valide", type="boolean"),
     *             @OA\Property(property="commentaires", type="string")
     *         )
     *     ),
     *     @OA\Response(response=201, description="✅ Document créé")
     * )
     */
    #[ScrambleResponse(201, 'Document créé (upload fichier + enregistrement). Retourne success, message, data.')]
    #[ScrambleResponse(403, 'Agent avec centre_id : accès refusé si le dossier lié n\'est pas de son centre.')]
    #[ScrambleResponse(422, 'Erreur de validation (fichier, documentable_id, documentable_type, type_document_id, etc.).')]
    public function store(StoreDocumentRequest $request): JsonResponse
    {
        try {

            DB::beginTransaction();

            // 1️⃣ Upload physique
            $file = $request->file('fichier');
            $path = $file->store('uploads'); // => storage/app/uploads/contrats

            // 2️⃣ Normalisation du type polymorphique
            $documentableType = str_replace('\\\\', '\\', trim($request->documentable_type, "\\"));
            if (strpos($documentableType, '\\') === false) {
                $documentableType = "App\\Models\\{$documentableType}";
            }

            if (!class_exists($documentableType)) {
                return response()->json(['success' => false, 'message' => "Le type [$documentableType] n'existe pas."], 422);
            }

            $documentable = $documentableType::find($request->documentable_id);
            if (!$documentable) {
                return response()->json(['success' => false, 'message' => "Aucun enregistrement trouvé pour l'ID [{$request->documentable_id}]."], 404);
            }


            $candidat = Candidat::find($documentable->candidat_id);

            $dossier = Dossier::find($documentable->id);

            $typeDemande = TypeDemande::find($dossier->type_demande_id);
            // $referentiel = Referentiel::find($dossier->referenciel_id);
            // Upload dans Alfresco
            // dd($typeDemande);
            //il me faut le nom du dossier
            //le nom d'usage de la personne
            //le type de document
            //le uuid de la personne

            $nodeId = $this->minioService->upload(
                $request->file('fichier'),
                dossier: $typeDemande->name,
                uuid: $candidat->personne_id,
                nomUsage: $candidat->personne->nom . "_" . $candidat->personne->prenom
            );
            //  dd($id);
            //  $apiUrl = env('APP_URL');
            //dd( $nodeId);

            // 3️ - Création du document en base
            if ($nodeId['path'] == null) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erreur lors du televersement du fichier dans alfresco. il se peut que le fichier existe déjà Dans la ged.',
                ], 500);
            } else {
                $document = Document::create([
                    'nom_fichier' => $file->getClientOriginalName(),
                    'chemin_fichier' => $path,
                    'type_mime' => $file->getMimeType(),
                    'taille_fichier' => $file->getSize(),
                    'valide' => $request->boolean('valide', true),
                    'commentaires' => $request->input('commentaires'),
                    'documentable_id' => $request->input('documentable_id'),
                    'documentable_type' => $documentableType,
                    'piece_justification_id' => $request->input('piece_justification_id'),
                    'node_id_alfresco' => $nodeId['path'],
                ]);
               
                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Document enregistré avec succès.',
                    'data' => new DocumentResource($document->load(['documentable']))
                ], 201);
            }

        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Erreur création document', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création du document.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/documents/{id}",
     *     operationId="getDocument",
     *     tags={"📄 Documents"},
     *     summary="🔍 Détails d'un document",
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string")),
     *     @OA\Response(response=200, description="✅ Détails du document"),
     *     @OA\Response(response=403, description="❌ Agent avec centre_id : document lié à un dossier d'un autre centre")
     * )
     */
    #[ScrambleResponse(403, 'Agent avec centre_id : accès refusé si le document est lié à un dossier d\'un autre centre.')]
    public function show(string $id): JsonResponse
    {
        try {
            $document = Document::with(['documentable', 'typeDocument'])->findOrFail($id);

            if ($document->documentable_type === Dossier::class && $document->documentable) {
                $forbidden = CentreScopeHelper::ensureAgentCanAccessDossier($document->documentable);
                if ($forbidden) {
                    return $forbidden;
                }
            }

            return response()->json([
                'success' => true,
                'data' => new DocumentResource($document)
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Document non trouvé.'
            ], 404);
        }
    }

    /**
     * @OA\Put(
     *     path="/api/documents/{id}",
     *     operationId="updateDocument",
     *     tags={"📄 Documents"},
     *     summary="✏️ Mettre à jour un document",
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string")),
     *     @OA\RequestBody(
     *         @OA\JsonContent(
     *             @OA\Property(property="valide", type="boolean"),
     *             @OA\Property(property="commentaires", type="string")
     *         )
     *     ),
     *     @OA\Response(response=200, description="✅ Document mis à jour"),
     *     @OA\Response(response=403, description="❌ Agent avec centre_id : document lié à un dossier d'un autre centre")
     * )
     */
    #[ScrambleResponse(403, 'Agent avec centre_id : accès refusé si le document est lié à un dossier d\'un autre centre.')]
    public function update(UpdateDocumentRequest $request, string $id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $document = Document::with('documentable')->findOrFail($id);

            if ($document->documentable_type === Dossier::class && $document->documentable) {
                $forbidden = CentreScopeHelper::ensureAgentCanAccessDossier($document->documentable);
                if ($forbidden) {
                    return $forbidden;
                }
            }

            $document->update($request->validated());

            DB::commit();

            Log::info('Document mis à jour', ['document_id' => $id]);

            return response()->json([
                'success' => true,
                'message' => 'Document mis à jour avec succès.',
                'data' => new DocumentResource($document->load(['documentable', 'typeDocument']))
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
     *     path="/api/documents/{id}",
     *     operationId="deleteDocument",
     *     tags={"📄 Documents"},
     *     summary="🗑️ Supprimer un document",
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string")),
     *     @OA\Response(response=200, description="✅ Document supprimé"),
     *     @OA\Response(response=403, description="❌ Agent avec centre_id : document lié à un dossier d'un autre centre")
     * )
     */
    #[ScrambleResponse(403, 'Agent avec centre_id : accès refusé si le document est lié à un dossier d\'un autre centre.')]
    public function destroy(string $id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $document = Document::with('documentable')->findOrFail($id);

            if ($document->documentable_type === Dossier::class && $document->documentable) {
                $forbidden = CentreScopeHelper::ensureAgentCanAccessDossier($document->documentable);
                if ($forbidden) {
                    return $forbidden;
                }
            }

            $document->delete();

            DB::commit();

            Log::info('Document supprimé', ['document_id' => $id]);
            //recuperation du nodeId à partir du chemin_fichier
            $parts = explode('/', $document->chemin_fichier);
            $nodeId = end($parts);
            // Suppression dans Alfresco
            $this->minioService->delete($document->node_id_alfresco);

            return response()->json([
                'success' => true,
                'message' => 'Document supprimé avec succès.'
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


    public function download(Document $document)
    {
        $path = $document->chemin_fichier;
        //dd($document);

        if (!Storage::exists($path)) {
            return response()->json([
                'success' => false,
                'message' => "Le fichier demandé est introuvable."
            ], 404);
        }

        // Pour afficher dans le navigateur (PDF, images, etc.)
        return Storage::response($path, $document->nom_fichier, [
            'Content-Type' => $document->type_mime,
        ]);
    }
}
