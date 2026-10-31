<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\PieceJustificative;
use Dedoc\Scramble\Attributes\Endpoint;
use Dedoc\Scramble\Attributes\Group;
use Dedoc\Scramble\Attributes\PathParameter;
use Dedoc\Scramble\Attributes\QueryParameter;
use Dedoc\Scramble\Attributes\Response as ScrambleResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

#[Group('Pièces justificatives', description: 'CRUD des pièces justificatives (étapes, documents). Liste paginée, création, détail, mise à jour, suppression.')]
class PieceJustificativeController extends Controller
{
    #[Endpoint(title: 'Liste des pièces justificatives', description: 'Liste paginée. Réponse paginator Laravel.')]
    #[QueryParameter('per_page', description: 'Nombre d\'éléments par page (1-100, défaut 15)', type: 'integer', required: false)]
    #[QueryParameter('page', description: 'Numéro de page', type: 'integer', required: false)]
    #[ScrambleResponse(200, 'Paginator Laravel : data, links, meta.')]
    public function index(Request $request)
    {
        return PieceJustificative::query()->paginate($this->perPage($request));
    }
    public function store(Request $request)
    {
        return PieceJustificative::create($request->all());
    }
    public function show(PieceJustificative $piece)
    {
        return $piece;
    }
    public function update(Request $request, PieceJustificative $piece)
    {
        $piece->update($request->all());
        return $piece;
    }
    public function destroy(PieceJustificative $piece)
    {
        $piece->delete();
        return response()->json(['message' => 'Supprimé']);
    }

    /**
     * Télécharger un document associé à une pièce justificative
     */
    public function downloadDocument(PieceJustificative $piece, Document $document)
    {
        // Vérifier que le document appartient à cette pièce justificative
        if (
            $document->documentable_type !== PieceJustificative::class ||
            $document->documentable_id !== $piece->id
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Ce document n\'appartient pas à cette pièce justificative.'
            ], 404);
        }

        // Vérifier que le fichier existe
        if (!Storage::disk('public')->exists($document->chemin_fichier)) {
            return response()->json([
                'success' => false,
                'message' => 'Le fichier n\'existe plus sur le serveur.'
            ], 404);
        }

        // Retourner le fichier pour téléchargement
        return Storage::disk('public')->download(
            $document->chemin_fichier,
            $document->nom_fichier
        );
    }

    /**
     * Obtenir l'URL de téléchargement d'un document
     */
    public function getDocumentUrl(PieceJustificative $piece, Document $document)
    {
        // Vérifier que le document appartient à cette pièce justificative
        if (
            $document->documentable_type !== PieceJustificative::class ||
            $document->documentable_id !== $piece->id
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Ce document n\'appartient pas à cette pièce justificative.'
            ], 404);
        }

        // Vérifier que le fichier existe
        if (!Storage::disk('public')->exists($document->chemin_fichier)) {
            return response()->json([
                'success' => false,
                'message' => 'Le fichier n\'existe plus sur le serveur.'
            ], 404);
        }

        // Retourner l'URL de téléchargement
        return response()->json([
            'success' => true,
            'download_url' => Storage::disk('public')->url($document->chemin_fichier),
            'document' => [
                'id' => $document->id,
                'nom_fichier' => $document->nom_fichier,
                'type_mime' => $document->type_mime,
                'taille_fichier' => $document->taille_fichier,
                'valide' => $document->valide,
                'created_at' => $document->created_at,
                'node_id_alfresco' => $document->node_id_alfresco,
            ]
        ]);
    }

    #[Endpoint(title: 'Documents d\'une pièce justificative', description: 'Liste paginée des documents de la pièce (métadonnées + download_url).')]
    #[PathParameter('piece', description: 'ID (UUID) de la pièce justificative', type: 'string', format: 'uuid')]
    #[QueryParameter('per_page', description: 'Nombre d\'éléments par page (1-100, défaut 15)', type: 'integer', required: false)]
    #[QueryParameter('page', description: 'Numéro de page', type: 'integer', required: false)]
    #[ScrambleResponse(200, 'success, piece_justificative, documents (page courante), pagination (current_page, last_page, per_page, total).')]
    public function documents(Request $request, PieceJustificative $piece)
    {
        $documents = $piece->documents()->with('typeDocument')->paginate($this->perPage($request));

        return response()->json([
            'success' => true,
            'piece_justificative' => [
                'id' => $piece->id,
                'libelle' => $piece->libelle,
                'obligatoire' => $piece->obligatoire,
                'etape_id' => $piece->etape_id,
            ],
            'documents' => collect($documents->items())->map(function ($document) {
                return [
                    'id' => $document->id,
                    'nom_fichier' => $document->nom_fichier,
                    'type_mime' => $document->type_mime,
                    'taille_fichier' => $document->taille_fichier,
                    'valide' => $document->valide,
                    'commentaires' => $document->commentaires,
                    'download_url' => Storage::disk('public')->url($document->chemin_fichier),
                    'created_at' => $document->created_at,
                    'updated_at' => $document->updated_at,
                    'node_id_alfresco' => $document->node_id_alfresco,
                ];
            })->values()->all(),
            'pagination' => [
                'current_page' => $documents->currentPage(),
                'last_page' => $documents->lastPage(),
                'per_page' => $documents->perPage(),
                'total' => $documents->total(),
            ],
        ]);
    }
}
