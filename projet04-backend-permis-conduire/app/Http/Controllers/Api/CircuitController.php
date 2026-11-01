<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Circuit\StoreCircuitRequest;
use App\Http\Requests\Circuit\UpdateCircuitRequest;
use App\Models\Circuit;
use Dedoc\Scramble\Attributes\Endpoint;
use Dedoc\Scramble\Attributes\Group;
use Dedoc\Scramble\Attributes\QueryParameter;
use Dedoc\Scramble\Attributes\Response as ScrambleResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

#[Group('Circuits', description: 'Gestion des circuits (étapes, workflow). Liste paginée des circuits avec leurs étapes.')]
class CircuitController extends Controller
{
    #[Endpoint(title: 'Liste des circuits', description: 'Liste paginée des circuits avec la relation etapes. Réponse au format paginator Laravel (data, links, meta).')]
    #[QueryParameter('per_page', description: 'Nombre d\'éléments par page (1-100, défaut 15)', type: 'integer', required: false)]
    #[QueryParameter('page', description: 'Numéro de page', type: 'integer', required: false)]
    #[ScrambleResponse(200, 'Paginator Laravel : data (circuits + etapes), links, meta (current_page, per_page, total, last_page).')]
    public function index(Request $request)
    {
        $cacheKey = 'circuits:' . md5(json_encode($request->all()));
        return Cache::tags(['circuits'])->remember($cacheKey, 3600, function () use ($request) {
            return Circuit::with('etapes')->paginate($this->perPage($request));
        });
    }

    /** Crée un circuit. Body validé par StoreCircuitRequest (libelle, actif, nom_entite, nationalite, type_permis). Retourne le circuit créé (201). */
    public function store(StoreCircuitRequest $request)
    {
        $circuit = Circuit::create($request->validated());
        Cache::tags(['circuits'])->flush();
        return response()->json($circuit, 201);
    }

    /** Détail d'un circuit par ID (binding) avec ses étapes. */
    public function show(Circuit $circuit)
    {
        return $circuit->load('etapes');
    }

    /** Met à jour un circuit. Retourne le circuit avec etapes. */
    public function update(UpdateCircuitRequest $request, Circuit $circuit)
    {
        $circuit->update($request->validated());
        Cache::tags(['circuits'])->flush();
        return $circuit->load('etapes');
    }

    /** Supprime un circuit. Retourne message de confirmation. */
    public function destroy(Circuit $circuit)
    {
        $circuit->delete();
        Cache::tags(['circuits'])->flush();
        return response()->json(['message' => 'Circuit supprimé']);
    }
}
