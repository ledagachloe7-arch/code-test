<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JournalTransition;
use Dedoc\Scramble\Attributes\Endpoint;
use Dedoc\Scramble\Attributes\Group;
use Dedoc\Scramble\Attributes\QueryParameter;
use Dedoc\Scramble\Attributes\Response as ScrambleResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

#[Group('Journal des transitions', description: 'Historique des transitions (circuit_id, date_heure). Liste paginée du journal.')]
class JournalTransitionController extends Controller
{
    #[Endpoint(title: 'Journal des transitions', description: 'Liste paginée, tri date_heure décroissant. Relations transition et circuit. Filtre optionnel circuit_id. Réponse paginator Laravel.')]
    #[QueryParameter('circuit_id', description: 'Filtrer par identifiant du circuit', type: 'string', format: 'uuid', required: false)]
    #[QueryParameter('per_page', description: 'Nombre d\'éléments par page (1-100, défaut 15)', type: 'integer', required: false)]
    #[QueryParameter('page', description: 'Numéro de page', type: 'integer', required: false)]
    #[ScrambleResponse(200, 'Paginator Laravel : data, links, meta.')]
    public function index(Request $request)
    {
        $cacheKey = 'journal_transitions:' . md5(json_encode($request->all()));
        $journaux = Cache::tags(['journal_transitions'])->remember($cacheKey, 3600, function () use ($request) {
            $query = JournalTransition::with(['transition', 'circuit']);

            if ($request->has('circuit_id')) {
                $query->where('circuit_id', $request->query('circuit_id'));
            }

            return $query
                ->orderBy('date_heure', 'desc')
                ->paginate($this->perPage($request));
        });

        return response()->json($journaux);
    }

    /**
     * Display the specified resource.
     */
    public function show(JournalTransition $journalTransition)
    {
        // Charger les relations associées
        $journalTransition->load(['transition', 'circuit']);

        return response()->json($journalTransition);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(JournalTransition $journalTransition)
    {
        $journalTransition->delete();
        Cache::tags(['journal_transitions'])->flush();
        return response()->json(['message' => 'Transition supprimé']);
    }
    
}
