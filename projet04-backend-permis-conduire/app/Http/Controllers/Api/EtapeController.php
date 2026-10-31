<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Etape\StoreEtapeRequest;
use App\Http\Requests\Etape\UpdateEtapeRequest;
use App\Models\Etape;
use App\Services\WorkflowService;
use Dedoc\Scramble\Attributes\Endpoint;
use Dedoc\Scramble\Attributes\Group;
use Dedoc\Scramble\Attributes\QueryParameter;
use Dedoc\Scramble\Attributes\Response as ScrambleResponse;
use Illuminate\Http\Request;

#[Group('Étapes', description: 'Gestion des étapes de workflow (circuit_id, code, libelle, statut, roles).')]
class EtapeController extends Controller
{
    protected WorkflowService $workflowService;

    public function __construct(WorkflowService $workflowService)
    {
        $this->workflowService = $workflowService;
    }

    #[Endpoint(title: 'Liste des étapes', description: 'Liste paginée des étapes avec circuit. Filtre optionnel circuit_id. Réponse paginator Laravel.')]
    #[QueryParameter('circuit_id', description: 'Filtrer par identifiant du circuit', type: 'string', format: 'uuid', required: false)]
    #[QueryParameter('per_page', description: 'Nombre d\'éléments par page (1-100, défaut 15)', type: 'integer', required: false)]
    #[QueryParameter('page', description: 'Numéro de page', type: 'integer', required: false)]
    #[ScrambleResponse(200, 'Paginator Laravel : data (étapes + circuit), links, meta.')]
    public function index(Request $request)
    {
        $query = Etape::with('circuit');

        if ($request->filled('circuit_id')) {
            $query->where('circuit_id', $request->query('circuit_id'));
        }

        return response()->json($query->paginate($this->perPage($request)), 200);
    }

    /** Crée une étape. Body validé par StoreEtapeRequest. Retourne l\'étape créée (201). */
    public function store(StoreEtapeRequest $request)
    {
        $etape = Etape::create($request->validated());
        return response()->json($etape, 201);
    }

    /** Détail d'une étape avec relation statut. */
    public function show(Etape $etape)
    {
        return $etape->load('statut');
    }

    /** Met à jour une étape. Retourne l\'étape avec etapes. */
    public function update(UpdateEtapeRequest $request, Etape $etape)
    {
        $etape->update($request->validated());
        return $etape->load('etapes');
    }

    public function destroy(Etape $etape)
    {
        $etape->delete();
        return response()->json(['message' => 'Etape supprimée']);
    }

    public function moveModel(Request $request)
    {
        // ✅ Validation
        $validated = $request->validate([
            'model_type' => [
                'required',
                'string',
                function ($attribute, $value, $fail) {
                    $modelClass = "\\App\\Models\\" . ucfirst($value);
                    if (!class_exists($modelClass)) {
                        $fail("Le modèle spécifié n’existe pas : {$value}");
                    }
                },
            ],
            'model_id' => ['required', 'uuid'],
            'transition_id' => ['required', 'uuid', 'exists:transitions,id'],
            'circuit_id' => ['required', 'uuid', 'exists:circuits,id'],
        ]);

        // ✅ Résolution dynamique du modèle
        $modelClass = "\\App\\Models\\" . ucfirst($validated['model_type']);
        $model = $modelClass::find($validated['model_id']);

        if (!$model) {
            return response()->json([
                'message' => "Aucun enregistrement trouvé pour le modèle « {$validated['model_type']} » avec l’ID fourni."
            ], 404);
        }

        // ✅ Appel du service
        $service = new WorkflowService();
        return $service->moveModel(
            $validated['circuit_id'],
            $validated['transition_id'],
            $model
        );
    }
}
