<?php

namespace App\Http\Controllers;

use App\Http\Requests\SearchHPermisLikeRequest;
use App\Models\HPermis;
use Illuminate\Http\Request;
use App\Services\HPermisService;
use Dedoc\Scramble\Attributes\Endpoint;
use Dedoc\Scramble\Attributes\Group;
use Dedoc\Scramble\Attributes\PathParameter;
use Dedoc\Scramble\Attributes\QueryParameter;
use Dedoc\Scramble\Attributes\Response as ScrambleResponse;

#[Group('Historique permis (h_permis)', description: 'Table `h_permis` : (1) `GET|POST /change-permis` — recherche existante (legacy `nomNumeroPermis`, règle « personne identifiée » qui regroupe par nom+prénom exact). (2) `GET|POST /h-permis/recherche` — recherche souple paginée (ILIKE, au moins un critère non vide). (3) `POST /create` — création d\'un enregistrement historique.')]
class HPermisController extends Controller
{
    protected $permisService;

    public function __construct(HPermisService $permisService)
    {
        $this->permisService = $permisService;
    }

    /**
     * Recherche par nom, prénom, date de naissance et/ou numéro de permis.
     * Paramètres : nom, prenom, date_naissance, numero_permis (query) ou nomNumeroPermis (path, legacy).
     * Si un enregistrement est trouvé, retourne tous les enregistrements de la même personne (nom+prénom exact).
     */
    #[Endpoint(title: 'Recherche change-permis', description: 'Recherche par nom, prénom, date de naissance et/ou numéro de permis. Query params : nom, prenom, date_naissance, numero_permis. Path param (legacy) : nomNumeroPermis. Si une personne est trouvée, retourne tous ses enregistrements (permis, renouvellements).')]
    #[PathParameter('nomNumeroPermis', description: 'Optionnel. Numéro de permis ou partie du nom (legacy)', type: 'string')]
    #[QueryParameter('nom', description: 'Nom (recherche partielle)', type: 'string', required: false)]
    #[QueryParameter('prenom', description: 'Prénom (recherche partielle)', type: 'string', required: false)]
    #[QueryParameter('date_naissance', description: 'Date de naissance (ex. 1990-05-15)', type: 'string', format: 'date', required: false)]
    #[QueryParameter('numero_permis', description: 'Numéro de permis (recherche partielle)', type: 'string', required: false)]
    #[ScrambleResponse(200, 'Tableau d\'enregistrements HPermis (liste vide si aucun résultat). Chaque élément : id, numero_identite, nom, prenom, sexe, nationalite, date_naissance, lieu_naissance, numero_permis, type_permis, categorie, date_obtention, lieu_obtention, date_validite, etc.')]
    public function index(Request $request, ?string $nomNumeroPermis = null)
    {
        // GET : query params ou path param ; POST : body (nom, prenom, date_naissance, numero_permis, nomNumeroPermis)
        $criteria = [
            'nomNumeroPermis' => $nomNumeroPermis ?? $request->input('nomNumeroPermis'),
            'nom' => $request->input('nom'),
            'prenom' => $request->input('prenom'),
            'date_naissance' => $request->input('date_naissance'),
            'numero_permis' => $request->input('numero_permis'),
        ];
        $resultats = $this->permisService->search($criteria);

        return response()->json($resultats, 200);
    }

    /**
     * Recherche souple paginée sur h_permis.
     * Contrat : au moins un des quatre critères doit toujours être envoyé avec une valeur non vide (recherche sans filtre interdite).
     * Les autres critères restent facultatifs ; plusieurs non vides sont combinés en ET.
     */
    #[Endpoint(
        title: 'Recherche h_permis (souple, paginée)',
        description: 'Chemins : `GET /h-permis/recherche` (query), `POST /h-permis/recherche` (JSON ou form). Au moins un paramètre non vide parmi nom, prenom, date_naissance, numero_permis. Autres critères facultatifs ; combinaison en ET. Correspondance partielle insensible à la casse (PostgreSQL ILIKE). Pagination : `page` défaut 1, `per_page` défaut 25, maximum 100.'
    )]
    #[QueryParameter('nom', description: 'Sous-chaîne du nom (au moins un des quatre critères doit être non vide au total).', type: 'string', required: false)]
    #[QueryParameter('prenom', description: 'Sous-chaîne du prénom.', type: 'string', required: false)]
    #[QueryParameter('date_naissance', description: 'Sous-chaîne sur la date formatée YYYY-MM-DD (ex. 1990, 1990-05).', type: 'string', required: false)]
    #[QueryParameter('numero_permis', description: 'Sous-chaîne du numéro de permis.', type: 'string', required: false)]
    #[QueryParameter('page', description: 'Numéro de page (défaut 1).', type: 'integer', required: false)]
    #[QueryParameter('per_page', description: 'Éléments par page (défaut 25, max 100).', type: 'integer', required: false)]
    #[ScrambleResponse(200, 'Pagination Laravel : `data` (tableau d\'objets HPermis), `total`, `per_page`, `current_page`, `last_page`, `from`, `to`, liens, etc.')]
    #[ScrambleResponse(422, 'Validation Laravel : `message` + `errors` (ex. clé `critères` si tous les critères de recherche sont vides ; ou types / max length).')]
    public function searchLike(SearchHPermisLikeRequest $request)
    {
        $validated = $request->validated();

        $criteria = [
            'nom' => $validated['nom'] ?? null,
            'prenom' => $validated['prenom'] ?? null,
            'date_naissance' => $validated['date_naissance'] ?? null,
            'numero_permis' => $validated['numero_permis'] ?? null,
        ];

        $page = max(1, (int) ($validated['page'] ?? 1));
        $perPage = max(1, min(100, (int) ($validated['per_page'] ?? 25)));

        return response()->json(
            $this->permisService->searchOptionalLike($criteria, $page, $perPage),
            200
        );
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Crée un nouvel enregistrement dans l'historique des permis (h_permis).
     */
    #[Endpoint(title: 'Créer un enregistrement historique permis', description: 'Crée un nouvel enregistrement dans la table h_permis. Corps : numero_identite, nom, prenom, sexe, nationalite, date_naissance, lieu_naissance, numero_permis, type_permis, categorie, date_obtention, lieu_obtention, date_validite, numero_origine_permis, lieu_origine, date_renou1, date_renou2, date_renou3. Les dates au format ISO sont converties en Y-m-d.')]
    #[ScrambleResponse(201, 'Enregistrement HPermis créé (objet avec id, champs remplis et timestamps).')]
    #[ScrambleResponse(422, 'Erreur de validation selon les règles du modèle.')]
    public function store(Request $request)
    {
        $permis = $this->permisService->createPermis($request->all());

        return response()->json($permis, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(HPermis $hPermis)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(HPermis $hPermis)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, HPermis $hPermis)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(HPermis $hPermis)
    {
        //
    }
}
