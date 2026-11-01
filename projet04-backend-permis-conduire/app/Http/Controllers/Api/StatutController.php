<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Statut\StoreStatutRequest;
use App\Http\Requests\Statut\UpdateStatutRequest;
use App\Models\Statut;
use Dedoc\Scramble\Attributes\Endpoint;
use Dedoc\Scramble\Attributes\Group;
use Dedoc\Scramble\Attributes\QueryParameter;
use Dedoc\Scramble\Attributes\Response as ScrambleResponse;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

#[Group('Statuts', description: 'CRUD des statuts (code, libelle, final, annulable).')]
class StatutController extends Controller
{
    #[Endpoint(title: 'Liste des statuts', description: 'Liste paginée des statuts. Réponse paginator Laravel.')]
    #[QueryParameter('per_page', description: 'Nombre d\'éléments par page (1-100, défaut 15)', type: 'integer', required: false)]
    #[QueryParameter('page', description: 'Numéro de page', type: 'integer', required: false)]
    #[ScrambleResponse(200, 'Paginator Laravel : data, links, meta.')]
    public function index(Request $request)
    {
        $cacheKey = 'statuts:' . md5(json_encode($request->all()));
        return Cache::tags(['statuts'])->remember($cacheKey, 3600, function () use ($request) {
            return Statut::query()->paginate($this->perPage($request));
        });
    }

    public function store(StoreStatutRequest $request)
    {
        $statut = Statut::create($request->all());
        Cache::tags(['statuts'])->flush();
        return $statut;
    }

    public function show(Statut $statut)
    {
        return $statut;
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateStatutRequest $request, Statut $statut)
    {
        $statut->update($request->validated());
        Cache::tags(['statuts'])->flush();
        return $statut;
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Statut $statut)
    {
        $statut->delete();
        Cache::tags(['statuts'])->flush();
        return response()->json(['message' => 'Statut supprimé']);
    }
}
