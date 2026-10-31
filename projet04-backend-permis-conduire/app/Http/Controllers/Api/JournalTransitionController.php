<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JournalTransition;
use Dedoc\Scramble\Attributes\Endpoint;
use Dedoc\Scramble\Attributes\Group;
use Dedoc\Scramble\Attributes\QueryParameter;
use Dedoc\Scramble\Attributes\Response as ScrambleResponse;
use Illuminate\Http\Request;

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
        $query = JournalTransition::with(['transition', 'circuit']); // relations utiles

        // Si un circuit_id est fourni dans l'URL
        if ($request->has('circuit_id')) {
            $query->where('circuit_id', $request->query('circuit_id'));
        }

        $journaux = $query
            ->orderBy('date_heure', 'desc')
            ->paginate($this->perPage($request));

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
        return response()->json(['message' => 'Transition supprimé']);
    }
    
}
