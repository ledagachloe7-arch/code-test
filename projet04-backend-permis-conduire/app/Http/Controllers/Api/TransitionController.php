<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Transitions\StoreTransitionRequest;
use App\Http\Requests\Transitions\UpdateTransitionRequest;
use App\Models\Transition;
use Dedoc\Scramble\Attributes\Endpoint;
use Dedoc\Scramble\Attributes\Group;
use Dedoc\Scramble\Attributes\QueryParameter;
use Dedoc\Scramble\Attributes\Response as ScrambleResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

#[Group('Transitions', description: 'Gestion des transitions entre étapes (workflow, circuit_id). Liste, création, mise à jour, suppression.')]
class TransitionController extends Controller
{
    #[Endpoint(title: 'Liste des transitions', description: 'Liste paginée des transitions (source, cible, circuit). Filtre optionnel circuit_id. Réponse paginator Laravel.')]
    #[QueryParameter('circuit_id', description: 'Filtrer par identifiant du circuit', type: 'string', format: 'uuid', required: false)]
    #[QueryParameter('per_page', description: 'Nombre d\'éléments par page (1-100, défaut 15)', type: 'integer', required: false)]
    #[QueryParameter('page', description: 'Numéro de page', type: 'integer', required: false)]
    #[ScrambleResponse(200, 'Paginator Laravel : data, links, meta.')]
    public function index(Request $request)
    {
        $cacheKey = 'transitions:' . md5(json_encode($request->all()));
        return Cache::tags(['transitions'])->remember($cacheKey, 3600, function () use ($request) {
            $query = Transition::with(['source', 'cible', 'circuit']);

            if ($request->has('circuit_id')) {
                $query->where('circuit_id', $request->query('circuit_id'));
            }

            return $query->paginate($this->perPage($request));
        });
    }

    public function store(StoreTransitionRequest $request)
    {
        return DB::transaction(function () use ($request) {
            $transition = Transition::create($request->validated());
            Cache::tags(['transitions'])->flush();
            return response()->json($transition->load(['source', 'cible', 'circuit']), 201);
        });
    }

    public function show(Transition $transition)
    {
        return response()->json($transition->load(['source', 'cible', 'circuit']));
    }

    public function update(UpdateTransitionRequest $request, Transition $transition)
    {
        $transition->update($request->validated());
        Cache::tags(['transitions'])->flush();
        return response()->json($transition->load(['source', 'cible', 'circuit']));
    }

    public function destroy(Transition $transition)
    {
        $transition->delete();
        Cache::tags(['transitions'])->flush();
        return response()->json(['message' => 'Transition supprimée avec succès.']);
    }
}
