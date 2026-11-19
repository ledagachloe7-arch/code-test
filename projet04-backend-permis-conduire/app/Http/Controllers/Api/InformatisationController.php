<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\InformatisationException;
use App\Http\Controllers\Controller;
use App\Models\AncienPermis;
use App\Services\InformatisationService;
use Dedoc\Scramble\Attributes\Endpoint;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

#[Group('Informatisation', description: 'Informatisation des anciens permis roses : import du registre Excel, recherche par ancien numéro, génération d\'un nouveau numéro unique (même année et province) et création du permis dans le registre.')]
class InformatisationController extends Controller
{
    public function __construct(protected InformatisationService $service)
    {
    }

    private function agent(Request $request)
    {
        return $request->attributes->get('authenticated_user');
    }

    private function erreur(InformatisationException $e): JsonResponse
    {
        return response()->json(['success' => false, 'message' => $e->getMessage()], $e->status());
    }

    #[Endpoint(title: 'Paramètres de l\'informatisation', description: 'Provinces, catégories, droits de l\'agent connecté et taille maximale d\'un envoi d\'import.')]
    public function parametres(Request $request): JsonResponse
    {
        $agent = $this->agent($request);
        return response()->json([
            'success' => true,
            'data' => [
                'provinces' => config('informatisation.provinces'),
                'categories' => config('informatisation.categories'),
                'longueur_ordre' => config('informatisation.longueur_ordre'),
                'lignes_par_envoi' => config('informatisation.lignes_par_envoi'),
                'peut_importer' => $this->service->peutImporter($agent),
                'peut_informatiser' => $this->service->peutInformatiser($agent),
                'stats' => AncienPermis::query()->selectRaw('statut, count(*) as nb')->groupBy('statut')->pluck('nb', 'statut'),
            ],
        ]);
    }

    #[Endpoint(title: 'Importer des lignes du registre Excel', description: 'JSON : fichier, lot (facultatif, pour enchaîner plusieurs envois du même fichier), lignes[] { ligne_excel, ancien_numero, nom, prenom, date_naissance, lieu_naissance, categories, date_obtention, date_validite, brut }. Les lignes déjà importées sont ignorées. Retourne le bilan et les anomalies.')]
    public function importer(Request $request): JsonResponse
    {
        $max = (int) config('informatisation.lignes_par_envoi');
        $data = $request->validate([
            'fichier' => 'nullable|string|max:255',
            'lot' => 'nullable|string|max:40',
            'lignes' => "required|array|min:1|max:{$max}",
            'lignes.*.ligne_excel' => 'nullable|integer',
            'lignes.*.ancien_numero' => 'nullable|string|max:100',
            'lignes.*.nom' => 'nullable|string|max:100',
            'lignes.*.prenom' => 'nullable|string|max:100',
            'lignes.*.date_naissance' => 'nullable|string|max:30',
            'lignes.*.lieu_naissance' => 'nullable|string|max:100',
            'lignes.*.categories' => 'nullable|string|max:50',
            'lignes.*.date_obtention' => 'nullable|string|max:30',
            'lignes.*.date_validite' => 'nullable|string|max:30',
            'lignes.*.brut' => 'nullable|array',
        ]);

        try {
            $bilan = $this->service->importer($data['lignes'], $data['fichier'] ?? null, $data['lot'] ?? null, $this->agent($request));
        } catch (InformatisationException $e) {
            return $this->erreur($e);
        }

        return response()->json(['success' => true, 'data' => $bilan]);
    }

    #[Endpoint(title: 'Rechercher par ancien numéro', description: 'Query : ancien_numero (ex. « 01/1983 /123455 WSDFGH »). Tolère espaces, séparateurs et zéro initial. Peut renvoyer plusieurs personnes partageant le même ancien numéro.')]
    public function rechercher(Request $request): JsonResponse
    {
        $data = $request->validate(['ancien_numero' => 'required|string|max:100']);
        return response()->json([
            'success' => true,
            'lecture' => $this->service->lireAncienNumero($data['ancien_numero']),
            'data' => $this->service->rechercher($data['ancien_numero']),
        ]);
    }

    #[Endpoint(title: 'Lignes importées', description: 'Liste paginée. Query : statut (A_INFORMATISER | INFORMATISE | ANOMALIE), lot, page, per_page.')]
    public function lignes(Request $request): JsonResponse
    {
        $data = $request->validate([
            'statut' => 'nullable|in:A_INFORMATISER,INFORMATISE,ANOMALIE',
            'lot' => 'nullable|string|max:40',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $page = AncienPermis::query()
            ->when($data['statut'] ?? null, fn ($q, $s) => $q->where('statut', $s))
            ->when($data['lot'] ?? null, fn ($q, $l) => $q->where('lot_import', $l))
            ->orderBy('lot_import', 'desc')->orderBy('ligne_excel')
            ->paginate((int) ($data['per_page'] ?? 25));

        return response()->json($page);
    }

    #[Endpoint(title: 'Informatiser un ancien permis', description: 'Génère un nouveau numéro unique par catégorie (même année et province que l\'ancien numéro) et crée le permis dans h_permis (ancien numéro conservé en numéro d\'origine). Idempotent.')]
    public function informatiser(Request $request, string $id): JsonResponse
    {
        try {
            $a = $this->service->informatiser($id, $this->agent($request));
        } catch (InformatisationException $e) {
            return $this->erreur($e);
        }

        return response()->json([
            'success' => true,
            'message' => 'Permis informatisé : ' . collect($a->nouveaux_numeros)->map(fn ($n) => "{$n['categorie']} → {$n['numero']}")->implode(', ') . '.',
            'data' => $a,
        ]);
    }
}
