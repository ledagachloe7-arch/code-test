<?php

namespace App\Http\Controllers\Api;

use Exception;
use App\Models\Dossier;
use App\Models\Document;
use App\Models\Referentiel;
use App\Models\AutoEcole;
use App\Models\Utilisateur;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use App\Http\Controllers\Controller;
use App\Http\Resources\DossierResource;
use App\Http\Resources\DocumentResource;
use App\Http\Requests\Dossier\ListDossiersEnvoiBiometrieRequest;
use App\Http\Requests\Dossier\ListDossiersHistoriqueRequest;
use App\Http\Requests\Dossier\StoreDossierRequest;
use App\Http\Requests\Dossier\UpdateDossierRequest;
use App\Notifications\DocumentRejectedNotification;
use App\Notifications\DocumentUploadedNotification;
use App\Http\Requests\Dossier\ValiderDossierRequest;
use App\Notifications\DocumentValidatedNotification;
use App\Notifications\DossierValidatedNotification;
use App\Notifications\DossierRejectedNotification;
use App\Notifications\DossierCreatedNotification;
use App\Http\Requests\Document\UploadDocumentRequest;
use App\Http\Requests\Document\ValiderDocumentRequest;
use App\Http\Requests\Dossier\TransfertDossierRequest;
use App\Http\Helpers\AuthHelper;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use App\Http\Services\DossierService;
use App\Http\Services\WebSocketService;
use App\Mail\ResultatBiometrieEmailService;
use Illuminate\Support\Facades\Mail;
use App\Models\TypeDemande;
use App\Jobs\SendAirtelSmsJob;
use App\Services\AirtelSmsService;
use App\Services\{AlfrescoCrudService, PaiementService, PaiementHistoriqueService, ChangePermisService};
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Auth;
use Dedoc\Scramble\Attributes\Endpoint;
use Dedoc\Scramble\Attributes\Group;
use Dedoc\Scramble\Attributes\QueryParameter;
use Dedoc\Scramble\Attributes\PathParameter;
use Dedoc\Scramble\Attributes\Response as ScrambleResponse;
use App\Http\Helpers\CentreScopeHelper;

/**
 * @OA\Server(
 *     url="http://localhost:8000",
 *     description="Serveur de développement local"
 * )
 * 
 * @OA\Server(
 *     url="https://9c8r7bbvybn.preview.infomaniak.website",
 *     description="Serveur de production Infomaniak"
 * )
 * 
 * @OA\Tag(
 *     name="📁 Dossiers",
 *     description="Gestion des dossiers de formation"
 * )
 */
#[Group('Dossiers', description: 'Gestion des dossiers (expired, suspended, province_id, centre_id, data_categorie en JSON nullable). Si le dossier a un centre_id, province_id est aligné sur la province liée au centre (parent_id du référentiel centre). Restriction centre : un agent (utilisateur avec centre_id, hors ROLE_CANDIDAT) ne voit et ne peut traiter que les dossiers de son centre ; les rôles admin reconnus (bypassesDossierCentreScope) voient tous les centres ; 403 si accès à un dossier d\'un autre centre pour un agent non admin. **Suivi remise carte au centre** : `GET /dossiers/envoi-biometrie` liste les dossiers dont le statut est l’un de **DOSSIER ENVOYER** (filtre liste), **CARTE_DISPONIBLE_AU_CENTRE**, **CARTE_REMIS_AU_CANDIDAT** ; `POST /dossiers/{dossier}/notifier-carte-disponible` (prérequis **`DOSSIER ENVOYER`**, voir `Dossier::STATUT_DOSSIER_ENVOYER`) envoie le SMS Airtel au candidat et passe au statut CARTE_DISPONIBLE_AU_CENTRE si l\'envoi réussit ; `POST /dossiers/{dossier}/carte-remise-candidat` passe de CARTE_DISPONIBLE_AU_CENTRE à CARTE_REMIS_AU_CANDIDAT.')]
class DossierController extends Controller
{
    protected DossierService $dossierService;
    protected $alfresco;
    protected $paynalaService;
    protected WebSocketService $webSocketService;
    protected ChangePermisService $changePermisService;
    public function __construct(
        PaiementService $paynalaService,
        DossierService $dossierService,
        AlfrescoCrudService $alfresco,
        WebSocketService $webSocketService,
        ChangePermisService $changePermisService
    ) {
        $this->dossierService = $dossierService;
        $this->alfresco = $alfresco;
        $this->paynalaService = $paynalaService;
        $this->webSocketService = $webSocketService;
        $this->changePermisService = $changePermisService;
    }

    /**
     * Liste paginée des dossiers. Filtres : candidat_id, auto_ecole_id, statut, expired, suspended, province_id, centre_id.
     * Les agents avec centre_id ne voient que les dossiers de leur centre.
     *
     * @OA\Get(
     *     path="/api/dossiers",
     *     operationId="getDossiers",
     *     tags={"📁 Dossiers"},
     *     summary="📋 Liste des dossiers",
     *     @OA\Parameter(name="candidat_id", in="query", @OA\Schema(type="string")),
     *     @OA\Parameter(name="auto_ecole_id", in="query", @OA\Schema(type="string")),
     *     @OA\Parameter(name="statut", in="query", @OA\Schema(type="string", enum={"en_attente","en_cours","valide","rejete"})),
     *     @OA\Response(response=200, description="✅ Liste des dossiers")
     * )
     */
    #[Endpoint(title: 'Liste des dossiers', description: 'Liste paginée des dossiers. Filtres : candidat_id, auto_ecole_id, statut (égalité stricte sur la valeur en base), expired, suspended, province_id, centre_id, per_page. Les agents avec centre_id ne voient que les dossiers dont centre_id correspond (les dossiers sans centre_id sont exclus pour ces agents).')]
    #[QueryParameter('per_page', description: 'Taille de page (nombre d\'éléments par page, défaut 15)', type: 'integer', required: false)]
    #[QueryParameter('expired', description: 'Filtrer par dossier expiré (true/false)', type: 'boolean', required: false)]
    #[QueryParameter('suspended', description: 'Filtrer par dossier suspendu (true/false)', type: 'boolean', required: false)]
    #[QueryParameter('province_id', description: 'Filtrer par référentiel province (UUID)', type: 'string', format: 'uuid', required: false)]
    #[QueryParameter('centre_id', description: 'Filtrer par référentiel centre (UUID)', type: 'string', format: 'uuid', required: false)]
    #[QueryParameter('candidat_id', description: 'Filtrer par candidat (UUID)', type: 'string', format: 'uuid', required: false)]
    #[QueryParameter('auto_ecole_id', description: 'Filtrer par auto-école (UUID)', type: 'string', format: 'uuid', required: false)]
    #[QueryParameter('statut', description: 'Filtrer par statut : égalité exacte avec dossiers.statut (chaîne libre selon vos données : en_attente, EN_ATTENTE_PAIEMENT, libellés workflow, etc.)', type: 'string', required: false)]
    #[ScrambleResponse(200, 'Liste paginée des dossiers avec candidat, autoEcole, formation, documents, typeDemande, province, centre, data_categorie. 403 si agent centre et dossier d\'un autre centre.')]
    public function index(Request $request): AnonymousResourceCollection
    {
        $authUser = AuthHelper::getAuthenticatedUser($request);
        $userId = $authUser ? $authUser->id : 'guest';
        $cacheKey = "dossiers:index:{$userId}:" . md5(json_encode($request->all()));

        $dossiers = Cache::tags(['dossiers'])->remember($cacheKey, 600, function () use ($request) {
            $query = Dossier::with(['candidat.personne', 'autoEcole', 'formation', 'documents', 'typeDemande', 'referentiel', 'province', 'centre', 'openedByUser.personne']);

            if ($request->has('candidat_id')) {
                $query->where('candidat_id', $request->candidat_id);
            }

            if ($request->has('auto_ecole_id')) {
                $query->where('auto_ecole_id', $request->auto_ecole_id);
            }

            if ($request->has('statut')) {
                $query->where('statut', $request->statut);
            }

            if ($request->has('expired')) {
                $query->where('expired', filter_var($request->expired, FILTER_VALIDATE_BOOLEAN));
            }

            if ($request->has('suspended')) {
                $query->where('suspended', filter_var($request->suspended, FILTER_VALIDATE_BOOLEAN));
            }

            if ($request->has('province_id')) {
                $query->where('province_id', $request->province_id);
            }

            if ($request->has('centre_id')) {
                $query->where('centre_id', $request->centre_id);
            }

            // Renouvellement : retrouver un dossier de digitalisation par numéro de permis (ou d'origine), tirets ignorés
            if ($request->filled('numero_permis')) {
                $numero = strtoupper(str_replace('-', '', trim((string) $request->numero_permis)));
                $query->where(fn($q) => $q
                    ->whereRaw("UPPER(REPLACE(numero_permis, '-', '')) = ?", [$numero])
                    ->orWhereRaw("UPPER(REPLACE(numero_origine_permis, '-', '')) = ?", [$numero]));
            }

            CentreScopeHelper::applyCentreScopeToDossiersQuery($query);

            return $query->latest()->paginate($request->get('per_page', 15));
        });

        return DossierResource::collection($dossiers);
    }

    /**
     * Statuts inclus dans le filtre `GET /dossiers/envoi-biometrie` uniquement (liste paginée).
     * Les actions POST « notifier carte » / « remise » gardent leurs propres prérequis (voir méthodes).
     *
     * @return list<string>
     */
    private static function statutsListeEnvoiBiometrie(): array
    {
        return [
            Dossier::STATUT_DOSSIER_ENVOYER,
            'CARTE_DISPONIBLE_AU_CENTRE',
            'CARTE_REMIS_AU_CANDIDAT',
        ];
    }

    /**
     * Dossiers en suivi remise de carte (liste par statut), paginés.
     */
    #[Endpoint(
        title: 'Dossiers — suivi remise carte (centre)',
        description: '**Chemin :** `GET /api/dossiers/envoi-biometrie`. Liste paginée des dossiers dont le `statut` est l’un de : **`DOSSIER ENVOYER`**, **`CARTE_DISPONIBLE_AU_CENTRE`**, **`CARTE_REMIS_AU_CANDIDAT`** (filtre SQL sur `dossiers.statut` uniquement pour cet endpoint). **Enchaînement typique :** `DOSSIER ENVOYER` → `POST .../notifier-carte-disponible` (SMS) → `CARTE_DISPONIBLE_AU_CENTRE` → `POST .../carte-remise-candidat` → `CARTE_REMIS_AU_CANDIDAT`. **Périmètre centre :** identique à `GET /dossiers` — agent avec `centre_id` : uniquement son site ; administrateurs (bypass) : tous les centres. **Filtres :** `date_from`, `date_to` (optionnels, `YYYY-MM-DD`) sur `updated_at` (journées incluses). **Pagination :** `page`, `per_page` (défaut 15, max 100). **Tri :** `updated_at` décroissant. Auth : Bearer (middleware `auth.token`).'
    )]
    #[QueryParameter('page', description: 'Numéro de page (défaut 1).', type: 'integer', required: false)]
    #[QueryParameter('per_page', description: 'Taille de page (défaut 15, max 100).', type: 'integer', required: false)]
    #[QueryParameter('date_from', description: 'Optionnel. Borne basse sur `updated_at` (YYYY-MM-DD, inclus).', type: 'string', format: 'date', required: false)]
    #[QueryParameter('date_to', description: 'Optionnel. Borne haute sur `updated_at` (YYYY-MM-DD, inclus).', type: 'string', format: 'date', required: false)]
    #[ScrambleResponse(200, 'Structure Laravel standard : `data` (tableau DossierResource), `current_page`, `per_page`, `total`, `from`, `to`, `last_page`, liens, etc.')]
    #[ScrambleResponse(401, 'Token absent ou invalide.')]
    #[ScrambleResponse(422, 'Paramètres de pagination ou dates invalides (ex. date_to avant date_from).')]
    public function indexEnvoiBiometrie(ListDossiersEnvoiBiometrieRequest $request): AnonymousResourceCollection
    {
        $validated = $request->validated();

        $query = Dossier::with(['candidat.personne', 'autoEcole', 'formation', 'documents', 'typeDemande', 'referentiel', 'province', 'centre', 'openedByUser.personne'])
            ->whereIn('statut', self::statutsListeEnvoiBiometrie());

        CentreScopeHelper::applyCentreScopeToDossiersQuery($query);

        if (! empty($validated['date_from'])) {
            $query->whereDate('updated_at', '>=', $validated['date_from']);
        }
        if (! empty($validated['date_to'])) {
            $query->whereDate('updated_at', '<=', $validated['date_to']);
        }

        $perPage = max(1, min(100, (int) ($validated['per_page'] ?? 15)));
        $page = max(1, (int) ($validated['page'] ?? 1));

        $dossiers = $query->latest('updated_at')->paginate($perPage, ['*'], 'page', $page);

        return DossierResource::collection($dossiers);
    }

    /**
     * Historique : dossiers créés par l'utilisateur connecté avec statut DOSSIER ENVOYER.
     */
    #[Endpoint(
        title: 'Historique des dossiers envoyés',
        description: '**Chemin :** `GET /api/dossiers/historique`. Endpoint d’historique des envois CNEDDT : retourne uniquement les dossiers créés par l’utilisateur connecté (`utilisateur_id`) avec le statut exact **`DOSSIER ENVOYER`**. **Portée centre :** aucun filtrage centre appliqué sur cet endpoint (l’utilisateur voit ses dossiers créés, tous centres confondus). **Pagination :** `page`, `per_page` (défaut 15, max 100). **Filtres optionnels :** `numero` (recherche partielle), `type_demande_id` (UUID), `date_from` et `date_to` (sur `created_at`, format `YYYY-MM-DD`, bornes inclusives). **Tri :** `created_at` décroissant.'
    )]
    #[QueryParameter('page', description: 'Numéro de page (défaut 1).', type: 'integer', required: false)]
    #[QueryParameter('per_page', description: 'Taille de page (défaut 15, max 100).', type: 'integer', required: false)]
    #[QueryParameter('numero', description: 'Filtre partiel sur le numéro de dossier.', type: 'string', required: false)]
    #[QueryParameter('type_demande_id', description: 'Filtre par type de demande (UUID).', type: 'string', format: 'uuid', required: false)]
    #[QueryParameter('date_from', description: 'Borne basse sur created_at (YYYY-MM-DD, inclus).', type: 'string', format: 'date', required: false)]
    #[QueryParameter('date_to', description: 'Borne haute sur created_at (YYYY-MM-DD, inclus).', type: 'string', format: 'date', required: false)]
    #[ScrambleResponse(200, 'Liste paginée Laravel (`data`, `current_page`, `per_page`, `total`, `last_page`, etc.) de `DossierResource` pour les dossiers du user connecté au statut exact `DOSSIER ENVOYER`.')]
    #[ScrambleResponse(401, 'Token absent ou invalide.')]
    #[ScrambleResponse(422, 'Paramètres invalides (pagination, dates, filtres).')]
    public function historique(ListDossiersHistoriqueRequest $request): AnonymousResourceCollection
    {
        $validated = $request->validated();
        $user = auth()->user();

        $query = Dossier::with(['candidat.personne', 'autoEcole', 'formation', 'documents', 'typeDemande', 'referentiel', 'province', 'centre', 'openedByUser.personne'])
            ->where('utilisateur_id', $user?->id)
            ->where('statut', Dossier::STATUT_DOSSIER_ENVOYER);

        if (! empty($validated['numero'])) {
            $query->where('numero', 'like', '%' . trim((string) $validated['numero']) . '%');
        }
        if (! empty($validated['type_demande_id'])) {
            $query->where('type_demande_id', $validated['type_demande_id']);
        }
        if (! empty($validated['date_from'])) {
            $query->whereDate('created_at', '>=', $validated['date_from']);
        }
        if (! empty($validated['date_to'])) {
            $query->whereDate('created_at', '<=', $validated['date_to']);
        }

        $perPage = max(1, min(100, (int) ($validated['per_page'] ?? 15)));
        $page = max(1, (int) ($validated['page'] ?? 1));

        $dossiers = $query->latest('created_at')->paginate($perPage, ['*'], 'page', $page);

        return DossierResource::collection($dossiers);
    }

    /**
     * Historique : dossiers créés par l'utilisateur connecté avec statut RETOUR_CNEDDT_POUR_MODIFICATION.
     */
    #[Endpoint(
        title: 'Historique des dossiers retour CNEDDT',
        description: '**Chemin :** `GET /api/dossiers/historique-retour-cneddt`. Endpoint d’historique des retours CNEDDT : retourne uniquement les dossiers créés par l’utilisateur connecté (`utilisateur_id`) avec le statut exact **`RETOUR_CNEDDT_POUR_MODIFICATION`**. **Portée centre :** aucun filtrage centre appliqué sur cet endpoint (tous centres confondus). **Pagination :** `page`, `per_page` (défaut 15, max 100). **Filtres optionnels :** `numero` (recherche partielle), `type_demande_id` (UUID), `date_from` et `date_to` (sur `created_at`, format `YYYY-MM-DD`, bornes inclusives). **Tri :** `created_at` décroissant.'
    )]
    #[QueryParameter('page', description: 'Numéro de page (défaut 1).', type: 'integer', required: false)]
    #[QueryParameter('per_page', description: 'Taille de page (défaut 15, max 100).', type: 'integer', required: false)]
    #[QueryParameter('numero', description: 'Filtre partiel sur le numéro de dossier.', type: 'string', required: false)]
    #[QueryParameter('type_demande_id', description: 'Filtre par type de demande (UUID).', type: 'string', format: 'uuid', required: false)]
    #[QueryParameter('date_from', description: 'Borne basse sur created_at (YYYY-MM-DD, inclus).', type: 'string', format: 'date', required: false)]
    #[QueryParameter('date_to', description: 'Borne haute sur created_at (YYYY-MM-DD, inclus).', type: 'string', format: 'date', required: false)]
    #[ScrambleResponse(200, 'Liste paginée Laravel (`data`, `current_page`, `per_page`, `total`, `last_page`, etc.) de `DossierResource` pour les dossiers du user connecté au statut exact `RETOUR_CNEDDT_POUR_MODIFICATION`.')]
    #[ScrambleResponse(401, 'Token absent ou invalide.')]
    #[ScrambleResponse(422, 'Paramètres invalides (pagination, dates, filtres).')]
    public function historiqueRetourCneddt(ListDossiersHistoriqueRequest $request): AnonymousResourceCollection
    {
        $validated = $request->validated();
        $user = auth()->user();

        $query = Dossier::with(['candidat.personne', 'autoEcole', 'formation', 'documents', 'typeDemande', 'referentiel', 'province', 'centre', 'openedByUser.personne'])
            ->where('utilisateur_id', $user?->id)
            ->where('statut', 'RETOUR_CNEDDT_POUR_MODIFICATION');

        if (! empty($validated['numero'])) {
            $query->where('numero', 'like', '%' . trim((string) $validated['numero']) . '%');
        }
        if (! empty($validated['type_demande_id'])) {
            $query->where('type_demande_id', $validated['type_demande_id']);
        }
        if (! empty($validated['date_from'])) {
            $query->whereDate('created_at', '>=', $validated['date_from']);
        }
        if (! empty($validated['date_to'])) {
            $query->whereDate('created_at', '<=', $validated['date_to']);
        }

        $perPage = max(1, min(100, (int) ($validated['per_page'] ?? 15)));
        $page = max(1, (int) ($validated['page'] ?? 1));

        $dossiers = $query->latest('created_at')->paginate($perPage, ['*'], 'page', $page);

        return DossierResource::collection($dossiers);
    }

    /**
     * SMS Airtel à l’usager : carte disponible au centre (libellé du centre du dossier). Si l’envoi réussit, statut → CARTE_DISPONIBLE_AU_CENTRE.
     * Réservé aux agents avec centre (ou administrateurs avec bypass). Dossier attendu : DOSSIER ENVOYER.
     */
    #[Endpoint(
        title: 'Notifier carte disponible au centre (SMS Airtel)',
        description: '**Chemin :** `POST /api/dossiers/{dossier}/notifier-carte-disponible` (UUID du dossier). **Qui peut appeler :** agents rattachés à un centre (`centre_id` + rôle hors candidat) ou administrateurs avec bypass périmètre centre ; les candidats reçoivent 403. **Prérequis dossier :** `statut` = **`DOSSIER ENVOYER`** (libellé exact, `Dossier::STATUT_DOSSIER_ENVOYER`) et dossier du centre de l’agent (sauf admin). **Numéro SMS :** téléphone du compte utilisateur du candidat, sinon `personnes.contact`. **Texte envoyé (modèle) :** `DGTT: Votre carte est disponible. Vous pouvez la retirer au centre : {libellé référentiel centre}.` — si pas de libellé : « votre centre d\'enregistrement ». Message tronqué à 160 caractères (Airtel). **Effet :** le statut passe à `CARTE_DISPONIBLE_AU_CENTRE` **uniquement** si l’API Airtel retourne succès ; en cas d’échec ou d’exception, le statut reste inchangé. Auth : Bearer (`auth.token`). Corps : vide (pas de JSON requis).'
    )]
    #[PathParameter('dossier', description: 'UUID du dossier (`dossiers.id`).', type: 'string', format: 'uuid')]
    #[ScrambleResponse(200, '`success` true, `message`, `data` : DossierResource (statut `CARTE_DISPONIBLE_AU_CENTRE`).')]
    #[ScrambleResponse(401, 'Non authentifié.')]
    #[ScrambleResponse(403, 'Candidat, agent sans centre, ou dossier d\'un autre centre.')]
    #[ScrambleResponse(404, 'Dossier introuvable.')]
    #[ScrambleResponse(422, 'Statut différent de DOSSIER ENVOYER, téléphone candidat absent, ou envoi SMS Airtel refusé / en erreur.')]
    public function notifierCarteDisponibleCentre(string $id): JsonResponse
    {
        $authBlock = $this->assertUtilisateurPeutAgirSuiviCarteCentre();
        if ($authBlock !== null) {
            return $authBlock;
        }

        try {
            $dossier = Dossier::with(['candidat.personne.utilisateur', 'centre'])->findOrFail($id);
        } catch (\Throwable) {
            return response()->json([
                'success' => false,
                'message' => 'Dossier non trouvé.',
            ], 404);
        }

        $forbidden = CentreScopeHelper::ensureAgentCanAccessDossier($dossier);
        if ($forbidden) {
            return $forbidden;
        }

        if ($dossier->statut !== Dossier::STATUT_DOSSIER_ENVOYER) {
            return response()->json([
                'success' => false,
                'message' => 'Le dossier doit être au statut DOSSIER ENVOYER pour envoyer cette notification.',
            ], 422);
        }

        $dossier->loadMissing('candidat.personne.utilisateur', 'centre');
        $phone = $dossier->candidat?->personne?->utilisateur?->telephone
            ?? $dossier->candidat?->personne?->contact
            ?? null;
        if ($phone === null || trim((string) $phone) === '') {
            return response()->json([
                'success' => false,
                'message' => 'Aucun numéro de téléphone (utilisateur ou contact) pour joindre le candidat.',
            ], 422);
        }

        $centreNom = $this->libelleCentrePourMessage($dossier);
        $message = 'DGTT: Votre carte est disponible. Vous pouvez la retirer au centre : ' . $centreNom . '.';
        if (strlen($message) > 160) {
            $message = substr($message, 0, 157) . '...';
        }

        try {
            $smsService = new AirtelSmsService();
            $diag = $smsService->sendWithDiagnostics((string) $phone, $message);
            $sent = $diag['success'] === true;
        } catch (\Throwable $e) {
            Log::error('[SMS] Carte disponible : exception', ['dossier_id' => $dossier->id, 'error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'envoi du SMS.',
                'sms_code' => 'exception',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 422);
        }

        if (! $sent) {
            $reason = $diag['reason'] ?? 'unknown';
            $payload = [
                'success' => false,
                'message' => 'L\'envoi du SMS a échoué ; le statut du dossier n\'a pas été modifié.',
                'sms_code' => $reason,
            ];
            if ($reason === 'invalid_gabon_phone') {
                $payload['hint'] = 'Le numéro du candidat (utilisateur ou contact) doit correspondre à un mobile Gabon après normalisation (indicatif 241, opérateur 01–07 puis 6 chiffres).';
            }
            if (config('app.debug')) {
                $payload['debug'] = array_filter([
                    'sanitized_phone' => $diag['sanitized_phone'] ?? null,
                    'airtel_response' => $diag['airtel_response'] ?? null,
                    'error' => $diag['error'] ?? null,
                ]);
            }

            return response()->json($payload, 422);
        }

        $dossier->update(['statut' => 'CARTE_DISPONIBLE_AU_CENTRE']);
        Cache::tags(['dossiers'])->flush();
        $dossier->refresh()->load(['candidat.personne', 'autoEcole', 'formation', 'province', 'centre']);

        Log::info('[SMS] Carte disponible notifiée', ['dossier_id' => $dossier->id]);

        return response()->json([
            'success' => true,
            'message' => 'SMS envoyé. Le dossier est passé au statut CARTE_DISPONIBLE_AU_CENTRE.',
            'data' => new DossierResource($dossier),
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * Confirme la remise physique de la carte au candidat : CARTE_DISPONIBLE_AU_CENTRE → CARTE_REMIS_AU_CANDIDAT.
     */
    #[Endpoint(
        title: 'Confirmer remise de la carte au candidat',
        description: '**Chemin :** `POST /api/dossiers/{dossier}/carte-remise-candidat` (UUID du dossier). À utiliser sur l’interface centre une fois la carte remise physiquement au candidat. **Qui peut appeler :** mêmes règles que `notifier-carte-disponible` (agent avec centre ou admin bypass ; pas les candidats). **Prérequis :** `statut` = `CARTE_DISPONIBLE_AU_CENTRE`. **Effet :** mise à jour immédiate du statut vers `CARTE_REMIS_AU_CANDIDAT` (pas d’SMS). Auth : Bearer (`auth.token`). Corps : vide.'
    )]
    #[PathParameter('dossier', description: 'UUID du dossier (`dossiers.id`).', type: 'string', format: 'uuid')]
    #[ScrambleResponse(200, '`success` true, `message`, `data` : DossierResource (statut `CARTE_REMIS_AU_CANDIDAT`).')]
    #[ScrambleResponse(401, 'Non authentifié.')]
    #[ScrambleResponse(403, 'Candidat, agent sans centre, ou dossier d\'un autre centre.')]
    #[ScrambleResponse(404, 'Dossier introuvable.')]
    #[ScrambleResponse(422, 'Statut différent de CARTE_DISPONIBLE_AU_CENTRE.')]
    public function confirmerCarteRemiseAuCandidat(string $id): JsonResponse
    {
        $authBlock = $this->assertUtilisateurPeutAgirSuiviCarteCentre();
        if ($authBlock !== null) {
            return $authBlock;
        }

        try {
            $dossier = Dossier::with(['candidat.personne', 'centre'])->findOrFail($id);
        } catch (\Throwable) {
            return response()->json([
                'success' => false,
                'message' => 'Dossier non trouvé.',
            ], 404);
        }

        $forbidden = CentreScopeHelper::ensureAgentCanAccessDossier($dossier);
        if ($forbidden) {
            return $forbidden;
        }

        if ($dossier->statut !== 'CARTE_DISPONIBLE_AU_CENTRE') {
            return response()->json([
                'success' => false,
                'message' => 'Le dossier doit être au statut CARTE_DISPONIBLE_AU_CENTRE pour confirmer la remise.',
            ], 422);
        }

        $dossier->update(['statut' => 'CARTE_REMIS_AU_CANDIDAT']);
        Cache::tags(['dossiers'])->flush();
        $dossier->refresh()->load(['candidat.personne', 'autoEcole', 'formation', 'province', 'centre']);

        Log::info('Carte remise au candidat confirmée', ['dossier_id' => $dossier->id]);

        return response()->json([
            'success' => true,
            'message' => 'Remise enregistrée. Statut : CARTE_REMIS_AU_CANDIDAT.',
            'data' => new DossierResource($dossier),
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }

    private function assertUtilisateurPeutAgirSuiviCarteCentre(): ?JsonResponse
    {
        $user = auth()->user();
        if (!$user instanceof Utilisateur) {
            return response()->json([
                'success' => false,
                'message' => 'Non authentifié.',
            ], 401);
        }

        $role = strtolower((string) ($user->role ?? ''));
        if ($role === 'role_candidat' || $role === 'candidat') {
            return response()->json([
                'success' => false,
                'message' => 'Action réservée aux agents du centre ou aux administrateurs.',
            ], 403);
        }

        if (!$user->bypassesDossierCentreScope() && !$user->isAgentWithCentre()) {
            return response()->json([
                'success' => false,
                'message' => 'Action réservée aux agents rattachés à un centre ou aux administrateurs.',
            ], 403);
        }

        return null;
    }

    private function libelleCentrePourMessage(Dossier $dossier): string
    {
        $dossier->loadMissing('centre');
        $lib = $dossier->centre?->libelle;
        if (is_string($lib) && trim($lib) !== '') {
            return trim($lib);
        }

        return 'votre centre d\'enregistrement';
    }

    /**
     * @OA\Post(
     *     path="/api/dossiers",
     *     operationId="storeDossier",
     *     tags={"📁 Dossiers"},
     *     summary="➕ Créer un dossier",
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"statut"},
     *             @OA\Property(property="candidat_id", type="string", format="uuid", nullable=true),
     *             @OA\Property(property="auto_ecole_id", type="string", format="uuid", nullable=true),
     *             @OA\Property(property="formation_id", type="string", format="uuid", nullable=true),
     *             @OA\Property(property="type_demande_id", type="string", format="uuid", nullable=true, description="Type de demande"),
     *             @OA\Property(property="statut", type="string", enum={"en_attente","en_cours","valide","rejete"}),
     *             @OA\Property(property="commentaires", type="string", nullable=true)
     *         )
     *     ),
     *     @OA\Response(response=201, description="✅ Dossier créé")
     * )
     */
    #[Endpoint(title: 'Créer un dossier', description: 'Crée un dossier. Body : statut (requis), candidat_id, auto_ecole_id, formation_id, type_demande_id, commentaires, referenciel_id, champs permis (numero_permis, numero_origine_permis, dates, lieu), expired, suspended, province_id (ignoré si un centre est appliqué), data_categorie (optionnel, objet ou tableau JSON). **`centre_id` : ne pas envoyer** (interdit) — si l’utilisateur connecté a un `centre_id`, il est appliqué au dossier et **`province_id` est alors rempli automatiquement** avec la province du centre (`parent_id` du référentiel centre). Sans centre, `province_id` reste celui du body (optionnel). **`code_paiement` : ne pas envoyer** (interdit) — généré par le serveur en `EN_ATTENTE_PAIEMENT`. Un numéro interne de dossier est généré automatiquement après création. La table change_permis est mise à jour ou historisée ; un même numero_permis peut déjà exister sans empêcher la création du dossier.')]
    #[ScrambleResponse(201, 'Dossier créé. Retourne success, message et data (DossierResource avec data_categorie si fourni).')]
    #[ScrambleResponse(422, 'Erreur de validation.')]
    #[ScrambleResponse(403, 'Agent avec centre_id : accès refusé.')]
    public function store(StoreDossierRequest $request): JsonResponse
    {
        try {
            DB::beginTransaction();

            $data = $request->validated();
            // Utilisateur qui crée le dossier (via AuthHelper)
            $user = AuthHelper::getAuthenticatedUser($request);
            if ($user) {
                $data['utilisateur_id'] = $user->id;
                // Agent / enrôleur : le dossier prend le centre de l’utilisateur connecté (non modifiable via le body).
                if ($user->centre_id !== null && $user->centre_id !== '') {
                    $data['centre_id'] = $user->centre_id;
                }
            }

            if (!empty($data['centre_id'])) {
                $this->applyProvinceIdFromCentre($data, $data['centre_id']);
            }

            // Renouvellement : un seul dossier en cours par numéro de permis (évite les doublons
            // en cas de double clic ou de reprise). On renvoie le dossier existant non encore transmis.
            $renouvellementEnCours = $this->findRenouvellementEnCours($data);
            if ($renouvellementEnCours) {
                DB::rollBack();

                return response()->json([
                    'success' => true,
                    'existing' => true,
                    'message' => 'Un renouvellement est déjà en cours pour ce permis : le dossier existant est repris.',
                    'data' => new DossierResource($renouvellementEnCours->load(['candidat.personne', 'typeDemande', 'referentiel', 'province', 'centre'])),
                ], 200);
            }

            $dossier = Dossier::create($data);

            // Charger les relations pour la notification
            $dossier->load(['candidat.personne', 'autoEcole.responsable.utilisateur', 'formation.typePermis', 'typeDemande', 'referentiel', 'province', 'centre']);

            // Créer un numéro aléatoire et l'affecter au dossier
            $letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            $numbers = '0123456789';
            $dossier_numero = $letters[random_int(0, 25)] . $letters[random_int(0, 25)]
                . $numbers[random_int(0, 9)] . $numbers[random_int(0, 9)] . $letters[random_int(0, 25)]
                . $numbers[random_int(0, 9)];

            $dossier->numero = $dossier_numero;

            // Envoyer une notification à l'auto-école
            $candidatName = $dossier->candidat->personne->nom ?? 'Candidat';
            $autoEcole = $dossier->autoEcole;

            if ($autoEcole && $autoEcole->responsable && $autoEcole->responsable->utilisateur) {
                $autoEcole->responsable->utilisateur->notify(
                    new DossierCreatedNotification($dossier, $candidatName)
                );
            }

            DB::commit();
            Cache::tags(['dossiers'])->flush();

            Log::info('Dossier créé', ['dossier_id' => $dossier->id]);
            // modification du dossier
            DB::table('dossiers')
                ->where('id', $dossier->id)
                ->update(['numero' => $dossier_numero]);

            // Historiser/assurer l'existence du permis dans la table change_permis
            // (idempotent : s'il existe déjà, rien de bloquant).
            $this->changePermisService->createChangePermis([
                'numero_permis' => $dossier->numero_permis,
                'numero_identite' => $dossier->candidat->numero_piece,
                'nom' => $dossier->candidat->personne->nom,
                'prenom' => $dossier->candidat->personne->prenom,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Dossier créé avec succès.',
                'data' => new DossierResource($dossier->load(['candidat.personne', 'autoEcole', 'formation', 'typeDemande', 'referentiel', 'province', 'centre']))
            ], 201);
        } catch (Exception $e) {
            DB::rollBack();

            Log::error('Erreur création dossier', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création du dossier.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/dossiers/{id}",
     *     operationId="getDossier",
     *     tags={"📁 Dossiers"},
     *     summary="🔍 Détails d'un dossier",
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string")),
     *     @OA\Response(response=200, description="✅ Détails du dossier"),
     *     @OA\Response(response=403, description="❌ Agent avec centre_id : dossier d'un autre centre")
     * )
     */
    #[Endpoint(title: 'Détail d\'un dossier', description: 'Retourne un dossier par id avec relations (candidat, autoEcole, formation, documents, province, centre, verrouillage). Les agents avec centre_id : uniquement si le dossier appartient à leur centre.')]
    #[ScrambleResponse(200, 'success, data (DossierResource).')]
    #[ScrambleResponse(403, 'Agent avec centre_id : accès refusé si le dossier n\'est pas de son centre.')]
    #[ScrambleResponse(404, 'Dossier non trouvé.')]
    public function show(string $id): JsonResponse
    {
        try {
            $dossier = Cache::tags(['dossiers'])->remember("dossiers:id:{$id}", 600, function () use ($id) {
                return Dossier::with(['candidat.personne', 'autoEcole', 'formation', 'documents', 'province', 'centre', 'openedByUser.personne'])->findOrFail($id);
            });

            $forbidden = CentreScopeHelper::ensureAgentCanAccessDossier($dossier);
            if ($forbidden) {
                return $forbidden;
            }

            return response()->json([
                'success' => true,
                'data' => new DossierResource($dossier)
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Dossier non trouvé.'
            ], 404);
        }
    }

    /**
     * @OA\Put(
     *     path="/api/dossiers/{id}",
     *     operationId="updateDossier",
     *     tags={"📁 Dossiers"},
     *     summary="✏️ Mettre à jour un dossier",
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string")),
     *     @OA\RequestBody(
     *         @OA\JsonContent(
     *             @OA\Property(property="auto_ecole_id", type="string", format="uuid", nullable=true),
     *             @OA\Property(property="formation_id", type="string", format="uuid", nullable=true),
     *             @OA\Property(property="statut", type="string"),
     *             @OA\Property(property="commentaires", type="string")
     *         )
     *     ),
     *     @OA\Response(response=200, description="✅ Dossier mis à jour"),
     *     @OA\Response(response=403, description="❌ Agent avec centre_id : dossier d'un autre centre")
     * )
     */
    #[Endpoint(title: 'Mettre à jour un dossier', description: 'Met à jour un dossier (PUT/PATCH). Champs optionnels : auto_ecole_id, formation_id, type_demande_id, statut, commentaires, referenciel_id, champs permis (numero_permis, etc.), expired, suspended, province_id (écrasé si un centre_id effectif est défini), centre_id, data_categorie (objet ou tableau JSON), date_modification. Si le dossier est au statut **`RETOUR_CNEDDT_POUR_MODIFICATION`**, le serveur force **`statut`** → **`ENVOI À LA BIOMETRIE`** (`Dossier::STATUT_ENVOI_A_LA_BIOMETRIE`) à l’enregistrement. **`province_id`** est recalculé depuis la province du centre (`parent_id` du référentiel) lorsque le dossier a un `centre_id` (existant ou transmis). Si `centre_id` est explicitement mis à null, `province_id` est remis à null. Permet de réaffecter l’auto-école et la formation. **`code_paiement` : ne pas envoyer** (interdit) — il est géré uniquement par le serveur.')]
    #[ScrambleResponse(200, 'Dossier mis à jour. Retourne success, message et data (DossierResource avec data_categorie).')]
    #[ScrambleResponse(403, 'Agent avec centre_id : accès refusé si le dossier n\'est pas de son centre.')]
    #[ScrambleResponse(404, 'Dossier non trouvé.')]
    #[ScrambleResponse(422, 'Erreur de validation.')]
    public function update(UpdateDossierRequest $request, string $id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $dossier = Dossier::findOrFail($id);

            $forbidden = CentreScopeHelper::ensureAgentCanAccessDossier($dossier);
            if ($forbidden) {
                return $forbidden;
            }

            $validated = $request->validated();

            $effectiveCentreId = array_key_exists('centre_id', $validated)
                ? $validated['centre_id']
                : $dossier->centre_id;

            if ($effectiveCentreId) {
                $this->applyProvinceIdFromCentre($validated, $effectiveCentreId);
            } elseif (array_key_exists('centre_id', $validated) && $validated['centre_id'] === null) {
                $validated['province_id'] = null;
            }

            if ($dossier->statut === 'RETOUR_CNEDDT_POUR_MODIFICATION') {
                $validated['statut'] = Dossier::STATUT_ENVOI_A_LA_BIOMETRIE;
            }

            $dossier->update($validated);

            DB::commit();
            Cache::tags(['dossiers'])->flush();

            // SMS attente de paiement : envoi synchrone via Airtel (même config que création de compte), sans queue/cron
            if ($request->statut === 'EN_ATTENTE_PAIEMENT') {
                $dossier->load('candidat.personne.utilisateur');
                $phone = $dossier->candidat?->personne?->utilisateur?->telephone
                    ?? $dossier->candidat?->personne?->contact
                    ?? null;
                if (!empty($phone) && !empty($dossier->code_paiement)) {
                    try {
                        $smsService = new AirtelSmsService();
                        $message = 'DGTT: Bonne nouvelle ! Votre dossier a été validé, vous pouvez effectuer le paiement muni du code ' . $dossier->code_paiement . '.';
                        if (strlen($message) > 160) {
                            $message = substr($message, 0, 157) . '...';
                        }
                        $sent = $smsService->send($phone, $message);
                        if ($sent) {
                            Log::info('[SMS] Paiement à effectuer envoyé (Airtel)', ['dossier_id' => $dossier->id, 'phone' => $phone]);
                        } else {
                            Log::warning('[SMS] Paiement à effectuer : envoi Airtel a échoué', ['dossier_id' => $dossier->id]);
                        }
                    } catch (\Throwable $e) {
                        Log::error('[SMS] Erreur envoi paiement à effectuer', ['dossier_id' => $dossier->id, 'error' => $e->getMessage()]);
                    }
                } else {
                    Log::warning('SMS attente de paiement non envoyé : pas de numéro ou pas de code_paiement', ['dossier_id' => $dossier->id]);
                }
            }

            Log::info('Dossier mis à jour', ['dossier_id' => $id]);

            return response()->json([
                'success' => true,
                'message' => 'Dossier mis à jour avec succès.',
                'data' => new DossierResource($dossier->load(['candidat.personne', 'autoEcole', 'formation', 'province', 'centre']))
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
     *     path="/api/dossiers/{id}",
     *     operationId="deleteDossier",
     *     tags={"📁 Dossiers"},
     *     summary="🗑️ Supprimer un dossier",
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string")),
     *     @OA\Response(response=200, description="✅ Dossier supprimé"),
     *     @OA\Response(response=403, description="❌ Agent avec centre_id : dossier d'un autre centre")
     * )
     */
    #[ScrambleResponse(403, 'Agent avec centre_id : accès refusé si le dossier n\'est pas de son centre.')]
    public function destroy(string $id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $dossier = Dossier::findOrFail($id);

            $forbidden = CentreScopeHelper::ensureAgentCanAccessDossier($dossier);
            if ($forbidden) {
                return $forbidden;
            }

            $dossier->delete();

            DB::commit();
            Cache::tags(['dossiers'])->flush();

            Log::info('Dossier supprimé', ['dossier_id' => $id]);

            return response()->json([
                'success' => true,
                'message' => 'Dossier supprimé avec succès.'
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

    /**
     * @OA\Post(
     *     path="/api/dossiers/{id}/upload-document",
     *     operationId="uploadDocument",
     *     tags={"📁 Dossiers"},
     *     summary="📤 Uploader un document",
     *     description="Upload un document et l'associe au dossier",
     *     security={{"BearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string")),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\MediaType(
     *             mediaType="multipart/form-data",
     *             @OA\Schema(
     *                 required={"type_document_id","fichier"},
     *                 @OA\Property(property="type_document_id", type="string", format="uuid"),
     *                 @OA\Property(property="fichier", type="string", format="binary"),
     *                 @OA\Property(property="commentaires", type="string")
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="✅ Document uploadé avec succès"
     *     ),
     *     @OA\Response(response=403, description="❌ Ce dossier ne vous appartient pas"),
     *     @OA\Response(response=404, description="❌ Dossier non trouvé")
     * )
     */
    public function uploadDocument(UploadDocumentRequest $request, string $id): JsonResponse
    {

        try {

            DB::beginTransaction();

            // Récupérer le dossier
            $dossier = Dossier::with('candidat.personne')->findOrFail($id);

            // Utilisateur connecté (via le Helper, alimenté par le middleware)
            $user = AuthHelper::getAuthenticatedUser($request);
            if ($user && !$user->relationLoaded('personne')) {
                $user->load('personne.candidat');
            }
            // Vérifier que le dossier appartient au candidat connecté (si l'utilisateur est un candidat)
            if ($user && $user->personne && $user->personne->candidat) {
                if ($dossier->candidat_id !== $user->personne->candidat->id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Ce dossier ne vous appartient pas.'
                    ], 403);
                }
            }
            if (!$user || !$user->personne) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur ou profil personne requis pour l\'upload.'
                ], 403);
            }
            $typeDemande = TypeDemande::find($dossier->type_demande_id);

            $nodeId = $this->alfresco->uploadSimple(
                $request,
                dossier: $typeDemande->name,
                uuid: $user->personne->id,
                nomUsage: $user->personne->nom . "_" . $user->personne->prenom
            );
            if ($nodeId['fileId'] == null) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erreur lors du televersement du fichier dans alfresco. il se peut que le fichier existe déjà Dans la ged.',
                ], 500);
            } else {
                // Upload du fichier
                $file = $request->file('fichier');
                $fileName = time() . '_' . $file->getClientOriginalName();
                $filePath = $file->storeAs('documents/' . date('Y/m'), $fileName, 'public');

                // Créer l'enregistrement du document via la relation polymorphique (automatique)
                $document = $dossier->documents()->create([
                    'type_document_id' => $request->type_document_id,
                    'nom_fichier' => $file->getClientOriginalName(),
                    'chemin_fichier' => $filePath,
                    'type_mime' => $file->getMimeType(),
                    'taille_fichier' => $file->getSize(),
                    'valide' => false,
                    'commentaires' => $request->commentaires,
                    'referenciel_id' => $request->referenciel_id,
                    'node_id_alfresco' => $nodeId['fileId'],
                ]);

                // Mettre à jour la date de modification du dossier
                $dossier->update(['date_modification' => now()]);

                // Envoyer des notifications
                $candidatName = $dossier->candidat->personne->nom ?? 'Candidat';

                // Notifier l'auto-école
                if ($dossier->autoEcole && $dossier->autoEcole->utilisateur) {
                    $dossier->autoEcole->utilisateur->notify(
                        new DocumentUploadedNotification($document, $candidatName)
                    );
                }

                DB::commit();

                Log::info('Document uploadé', [
                    'document_id' => $document->id,
                    'dossier_id' => $dossier->id,
                    'nom_fichier' => $fileName
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Document uploadé avec succès !',
                    'document' => new DocumentResource($document->load(['typeDocument']))
                ], 201);
            }
        } catch (Exception $e) {
            DB::rollBack();

            Log::error('Erreur upload document', [
                'dossier_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'upload du document.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * @OA\Post(
     *     path="/api/dossiers/{id}/valider",
     *     operationId="validerDossier",
     *     tags={"📁 Dossiers"},
     *     summary="✅ Valider ou rejeter un dossier",
     *     description="Permet à une auto-école de valider ou rejeter un dossier de candidature",
     *     security={{"BearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string")),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"statut"},
     *             @OA\Property(property="statut", type="string", enum={"valide","rejete"}, example="valide"),
     *             @OA\Property(property="commentaires", type="string", example="Dossier complet et conforme")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="✅ Dossier validé/rejeté",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string"),
     *             @OA\Property(property="dossier", type="object")
     *         )
     *     ),
     *     @OA\Response(response=403, description="❌ Non autorisé ou agent avec centre_id : dossier d'un autre centre"),
     *     @OA\Response(response=404, description="❌ Dossier non trouvé")
     * )
     */
    #[ScrambleResponse(403, 'Agent avec centre_id : accès refusé si le dossier n\'est pas de son centre.')]
    public function valider(ValiderDossierRequest $request, string $id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $dossier = Dossier::with(['candidat.personne', 'autoEcole', 'formation'])->findOrFail($id);

            $forbidden = CentreScopeHelper::ensureAgentCanAccessDossier($dossier);
            if ($forbidden) {
                return $forbidden;
            }

            // Vérifier que l'utilisateur est responsable de cette auto-école (ou admin)
            $token = $request->bearerToken();
            if ($token) {
                $payload = json_decode(base64_decode($token), true);
                $user = Utilisateur::with('personne')->find($payload['user_id']);

                if ($user && $user->personne) {
                    $autoEcole = AutoEcole::where('responsable_id', $user->personne->id)
                        ->where('id', $dossier->auto_ecole_id)
                        ->first();

                    if (!$autoEcole && $user->role !== 'admin') {
                        return response()->json([
                            'success' => false,
                            'message' => 'Vous n\'êtes pas autorisé à valider ce dossier.'
                        ], 403);
                    }
                }
            }

            // Mettre à jour le dossier
            $dossier->update([
                'statut' => $request->statut,
                'date_modification' => now(),
                'commentaires' => $request->commentaires,
            ]);

            // Envoyer des notifications
            $candidatName = $dossier->candidat->personne->nom ?? 'Candidat';

            if ($request->statut === 'valide') {
                // Notifier le candidat que son dossier est validé
                if ($dossier->candidat->personne->utilisateur) {
                    $dossier->candidat->personne->utilisateur->notify(
                        new DossierValidatedNotification($dossier, $candidatName)
                    );
                }
            } else {
                // Notifier le candidat que son dossier est rejeté
                if ($dossier->candidat->personne->utilisateur) {
                    $dossier->candidat->personne->utilisateur->notify(
                        new DossierRejectedNotification($dossier, $candidatName, $request->commentaires)
                    );
                }
            }

            DB::commit();
            Cache::tags(['dossiers'])->flush();

            $message = $request->statut === 'valide'
                ? 'Dossier validé avec succès !'
                : 'Dossier rejeté.';

            Log::info('Dossier validé/rejeté', [
                'dossier_id' => $id,
                'statut' => $request->statut,
                'responsable_id' => $user->personne->id ?? null
            ]);

            return response()->json([
                'success' => true,
                'message' => $message,
                'dossier' => new DossierResource($dossier)
            ]);
        } catch (Exception $e) {
            DB::rollBack();

            Log::error('Erreur validation dossier', [
                'dossier_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la validation du dossier.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * @OA\Post(
     *     path="/api/documents/{id}/valider",
     *     operationId="validerDocument",
     *     tags={"📄 Documents"},
     *     summary="✅ Valider ou rejeter un document",
     *     description="Permet à une auto-école de valider ou rejeter un document",
     *     security={{"BearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string")),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"valide"},
     *             @OA\Property(property="valide", type="boolean", example=true),
     *             @OA\Property(property="commentaires", type="string", example="Document conforme")
     *         )
     *     ),
     *     @OA\Response(response=200, description="✅ Document validé/rejeté"),
     *     @OA\Response(response=403, description="❌ Non autorisé ou agent avec centre_id : dossier du document d'un autre centre")
     * )
     */
    #[ScrambleResponse(403, 'Agent avec centre_id : accès refusé si le dossier du document n\'est pas de son centre.')]
    public function validerDocument(ValiderDocumentRequest $request, string $id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $document = Document::with('dossier.autoEcole')->findOrFail($id);

            $forbidden = CentreScopeHelper::ensureAgentCanAccessDossier($document->dossier);
            if ($forbidden) {
                return $forbidden;
            }

            // Vérifier que l'utilisateur est responsable de l'auto-école du dossier
            $token = $request->bearerToken();
            if ($token) {
                $payload = json_decode(base64_decode($token), true);
                $user = Utilisateur::with('personne')->find($payload['user_id']);

                if ($user && $user->personne) {
                    $autoEcole = AutoEcole::where('responsable_id', $user->personne->id)
                        ->where('id', $document->dossier->auto_ecole_id)
                        ->first();

                    if (!$autoEcole && $user->role !== 'admin') {
                        return response()->json([
                            'success' => false,
                            'message' => 'Vous n\'êtes pas autorisé à valider ce document.'
                        ], 403);
                    }
                }
            }

            // Mettre à jour le document
            $document->update([
                'valide' => $request->valide,
                'commentaires' => $request->commentaires,
            ]);

            // Mettre à jour la date de modification du dossier
            $document->dossier->update(['date_modification' => now()]);

            // Envoyer des notifications
            $candidatName = $document->dossier->candidat->personne->nom ?? 'Candidat';

            if ($request->valide) {
                // Notifier le candidat que son document est validé
                if ($document->dossier->candidat->personne->utilisateur) {
                    $document->dossier->candidat->personne->utilisateur->notify(
                        new DocumentValidatedNotification($document, $candidatName)
                    );
                }
            } else {
                // Notifier le candidat que son document est rejeté
                if ($document->dossier->candidat->personne->utilisateur) {
                    $document->dossier->candidat->personne->utilisateur->notify(
                        new DocumentRejectedNotification($document, $candidatName, $request->commentaires)
                    );
                }
            }

            DB::commit();

            $message = $request->valide
                ? 'Document validé avec succès !'
                : 'Document rejeté.';

            Log::info('Document validé/rejeté', [
                'document_id' => $id,
                'valide' => $request->valide
            ]);

            return response()->json([
                'success' => true,
                'message' => $message,
                'document' => new DocumentResource($document->load('typeDocument'))
            ]);
        } catch (Exception $e) {
            DB::rollBack();

            Log::error('Erreur validation document', [
                'document_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la validation du document.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/dossiers/{id}/complet",
     *     operationId="getDossierComplet",
     *     tags={"📁 Dossiers"},
     *     summary="📊 Dossier complet avec toutes les relations",
     *     description="Récupère toutes les informations d'un dossier incluant candidat, auto-école, formation, documents et programme sessions",
     *     security={{"BearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="string", format="uuid")),
     *     @OA\Response(response=200, description="✅ Dossier complet"),
     *     @OA\Response(response=403, description="❌ Agent avec centre_id : dossier d'un autre centre"),
     *     @OA\Response(response=404, description="❌ Dossier non trouvé")
     * )
     */
    #[ScrambleResponse(403, 'Agent avec centre_id : accès refusé si le dossier n\'est pas de son centre.')]
    public function complet(string $id): JsonResponse
    {
        try {
            $dossier = Dossier::with([
                'candidat.personne.utilisateur',
                'autoEcole',
                'formation.typePermis',
                'formation.session',
                'documents',
                'programmeSessions',
                'province',
                'centre',
            ])->findOrFail($id);

            $forbidden = CentreScopeHelper::ensureAgentCanAccessDossier($dossier);
            if ($forbidden) {
                return $forbidden;
            }

            return response()->json([
                'success' => true,
                'dossier' => new DossierResource($dossier)
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Dossier non trouvé.'
            ], 404);
        } catch (Exception $e) {
            Log::error('Erreur lors de la récupération du dossier complet', [
                'dossier_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération du dossier complet.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * @OA\Post(
     *     path="/api/dossiers/transfert",
     *     operationId="transfertDossiers",
     *     tags={"📁 Dossiers"},
     *     summary="📤 Transfert d'un ou plusieurs dossiers vers le CNEDDT",
     *     description="Envoi vers l'API CNEDDT. Mode 1 dossier : fournir dossier_id + type_demande_id. Mode masse : fournir dossiers[] (max 100 éléments). Optionnel : email, personne_email ou candidat_email pour surcharge email biométrie. L'email dans le payload CNEDDT est facultatif (null si absent). Après réponse HTTP réussie (2xx) par dossier : statut dossier → DOSSIER ENVOYER ; SMS au candidat (file) avec shortcode CNEDDT. Échec CNEDDT : statut inchangé. Agents avec centre_id : uniquement les dossiers de leur centre.",
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="dossier_id", type="string", format="uuid", description="ID du dossier (mode 1 dossier ; requis si dossiers non fourni)"),
     *             @OA\Property(property="type_demande_id", type="string", format="uuid", description="ID du type de demande (requis si dossiers non fourni)"),
     *             @OA\Property(property="dossiers", type="array", maxItems=100, description="Mode masse : liste de { dossier_id, type_demande_id }",
     *                 @OA\Items(
     *                     @OA\Property(property="dossier_id", type="string", format="uuid"),
     *                     @OA\Property(property="type_demande_id", type="string", format="uuid")
     *                 )
     *             ),
     *             @OA\Property(property="email", type="string", nullable=true, description="Surcharge email biométrie (tous les dossiers)"),
     *             @OA\Property(property="personne_email", type="string", nullable=true),
     *             @OA\Property(property="candidat_email", type="string", nullable=true)
     *         )
     *     ),
     *     @OA\Response(response=200, description="success (bool), message (string), total (int), sent_count (int), skipped (array {dossier_id, reason}), results (array { dossier_id, result }). Chaque result : success (bool) = envoi CNEDDT réussi (HTTP 2xx + JSON.success true si présent) ; data = corps JSON CNEDDT (ex. success, code, message, data.cashier_short_code, …) ; http_status (int) si HTTP OK ; sinon status/body ou message selon erreur."),
     *     @OA\Response(response=422, description="Validation échouée ou aucun dossier éligible"),
     *     @OA\Response(response=403, description="Agent avec centre_id : accès refusé si dossier d'un autre centre")
     * )
     * Transfert d'un ou plusieurs dossiers vers le CNEDDT. Optimisé : 2 requêtes SQL + envoi HTTP en parallèle (Http::pool).
     */
    #[Endpoint(
        title: 'Transfert CNEDDT',
        description: '**Requête :** mode 1 dossier (`dossier_id`, `type_demande_id`) ou mode masse (`dossiers[]`, max 100). Emails optionnels pour la file biométrie. **Corps envoyé au CNEDDT :** `{ "data": { "dossier_id", … } }` (voir implémentation). **Réponse 200 (enveloppe CNEPC) :** `success` = au moins un envoi CNEDDT réussi (`sent_count` ≥ 1) ; `message` = résumé ; `total` = nombre d’appels CNEDDT lancés ; `sent_count` = nombre où `results[].result.success` est true ; `skipped` = dossiers non envoyés avant HTTP (introuvable, centre, payload null) `{ dossier_id, reason }` ; `results` = un objet par dossier envoyé au pool HTTP : `dossier_id` (UUID) ; `result` avec **`success`** (bool) : true seulement si réponse HTTP 2xx **et** si le JSON CNEDDT ne contient pas `success: false` ; **`data`** : corps JSON brut du CNEDDT quand HTTP OK (ex. `{ "success": true, "code": 201, "message": "…", "data": { "uuid", "cashier_short_code", "numero_driving_license", … } }`) ; **`http_status`** (int, ex. 201) ; en échec HTTP : `status`, `body` ; config manquante / exception : `message`, parfois `skipped: true`. **Effet base :** si `result.success` est true pour une ligne, le dossier est mis à jour en **`DOSSIER ENVOYER`** et un SMS candidat est mis en file (code caisse lu dans `data.data.cashier_short_code` ou équivalent). **Front :** traiter dossier par dossier via `results` ; ne pas se fier uniquement au HTTP 200 global si `sent_count` < `total`.'
    )]
    #[ScrambleResponse(200, '**Enveloppe :** `success` (bool), `message` (string), `total` (int), `sent_count` (int), `skipped` (array `{ dossier_id, reason }`), `results` (array). **Chaque `results[i]` :** `dossier_id` (UUID), `result` = objet avec `success` (bool) — true = CNEDDT OK (HTTP 2xx + champ JSON `success` absent ou true) ; `data` (object|null) — corps CNEDDT typique succès : `success`, `code` (ex. 201), `message`, `data` (objet permis : `cashier_short_code`, `uuid`, `numero_driving_license`, `first_name`, `last_name`, `status`, `issue_date`, `categories_created`, `created_at`, …) ; `http_status` (int) si succès HTTP ; si échec : `status` (int HTTP), `body` (string) ou `message` (string).')]
    #[ScrambleResponse(422, 'Validation `TransfertDossierRequest`, ou `success: false` avec `message` « Aucun dossier à transférer » / « Aucun dossier éligible » + `skipped` si applicable.')]
    #[ScrambleResponse(403, 'Agent avec centre_id : accès refusé si le dossier n\'est pas de son centre.')]
    public function transfert(TransfertDossierRequest $request): JsonResponse
    {
        $items = $request->getDossiersToTransfer();
        if (empty($items)) {
            return response()->json([
                'success' => false,
                'message' => 'Aucun dossier à transférer.',
            ], 422);
        }

        // Dédupliquer par (dossier_id, type_demande_id) pour éviter les envois en double
        $items = collect($items)->unique(fn($i) => $i['dossier_id'] . '|' . $i['type_demande_id'])->values()->all();

        $dossierIds = array_unique(array_column($items, 'dossier_id'));
        $typeDemandeIds = array_unique(array_column($items, 'type_demande_id'));

        // 1 requête : types de demande avant chargement dossier (relations conditionnelles)
        $typeDemandeNamesById = TypeDemande::whereIn('id', $typeDemandeIds)->pluck('name', 'id');

        $nouveauPermisDossierIds = [];
        foreach ($items as $item) {
            if (($typeDemandeNamesById[$item['type_demande_id']] ?? null) === 'NOUVEAUPERMIS') {
                $nouveauPermisDossierIds[] = $item['dossier_id'];
            }
        }
        $nouveauPermisDossierIds = array_unique($nouveauPermisDossierIds);

        // 1 requête : relations communes ; auto-école / formation uniquement pour NOUVEAUPERMIS
        $dossiersById = Dossier::with(['candidat.personne.utilisateur', 'referentiel'])
            ->whereIn('id', $dossierIds)
            ->get()
            ->keyBy('id');

        if ($nouveauPermisDossierIds !== []) {
            Dossier::with(['autoEcole.province', 'formation.typePermis'])
                ->whereIn('id', $nouveauPermisDossierIds)
                ->get()
                ->each(function (Dossier $loaded) use ($dossiersById): void {
                    $dossier = $dossiersById->get($loaded->id);
                    if ($dossier) {
                        $dossier->setRelation('autoEcole', $loaded->autoEcole);
                        $dossier->setRelation('formation', $loaded->formation);
                    }
                });
        }

        $toSend = [];
        $skipped = [];
        $singleEmailOverride = $request->filled('email') ? $request->email : ($request->filled('personne_email') ? $request->personne_email : $request->input('candidat_email'));

        foreach ($items as $item) {
            $dossierId = $item['dossier_id'];
            $typeDemandeId = $item['type_demande_id'];

            $dossier = $dossiersById->get($dossierId);
            if (!$dossier) {
                $skipped[] = ['dossier_id' => $dossierId, 'reason' => 'Dossier introuvable.'];
                continue;
            }

            $forbidden = CentreScopeHelper::ensureAgentCanAccessDossier($dossier);
            if ($forbidden) {
                $skipped[] = ['dossier_id' => $dossierId, 'reason' => 'Accès refusé (centre).'];
                continue;
            }

            // Renouvellement déjà transmis : ne pas renvoyer au CNEDDT (éviterait un doublon de catégories).
            if (($typeDemandeNamesById[$typeDemandeId] ?? null) === 'RENOUVELLEMENT'
                && $dossier->statut === Dossier::STATUT_DOSSIER_ENVOYER) {
                $skipped[] = ['dossier_id' => $dossierId, 'reason' => 'Renouvellement déjà transmis au CNEDDT.'];
                continue;
            }

            // Filet de sécurité : nouvelles dates calculées si elles ne l'ont pas été à la vérification du paiement.
            $this->appliquerNouvellesDatesRenouvellement($dossier);

            $payload = $this->buildPayloadForTransfert($dossier, $typeDemandeId, $typeDemandeNamesById);
            if ($payload === null) {
                $skipped[] = ['dossier_id' => $dossierId, 'reason' => 'Impossible de construire le payload (données manquantes).'];
                continue;
            }

            // Renouvellement : pas de passage en biométrie, donc pas d'email de convocation biométrique.
            if (($typeDemandeNamesById[$typeDemandeId] ?? null) !== 'RENOUVELLEMENT') {
                $email = $singleEmailOverride ?? $dossier->candidat?->personne?->email;
                $this->queueBiometrieEmailForDossier($dossier, $email);
            }

            $toSend[] = ['dossier_id' => $dossierId, 'payload' => $payload];
        }

        if (empty($toSend)) {
            return response()->json([
                'success' => false,
                'message' => 'Aucun dossier éligible au transfert.',
                'skipped' => $skipped,
            ], 422);
        }

        $results = $this->dossierService->sendManyToCneddt($toSend);

        $successCount = collect($results)->filter(fn($r) => ($r['result']['success'] ?? false) === true)->count();
        $total = count($results);
        $isSingle = $total === 1;
        $message = $isSingle
            ? ($successCount ? 'Le dossier a bien été transmis.' : 'Échec de l\'envoi du dossier.')
            : "{$successCount}/{$total} dossier(s) transmis au CNEDDT.";

        if (!empty($skipped)) {
            $message .= ' ' . count($skipped) . ' dossier(s) ignoré(s) (accès ou données).';
        }

        // Transfert réussi (HTTP 2xx) : statut aligné + SMS candidat (file).
        foreach ($results as $r) {
            if (($r['result']['success'] ?? false) !== true) {
                continue;
            }
            $dossierId = $r['dossier_id'];
            $dossier = $dossiersById->get($dossierId);
            if (!$dossier) {
                continue;
            }
            $forbidden = CentreScopeHelper::ensureAgentCanAccessDossier($dossier);
            if ($forbidden) {
                continue;
            }
            Dossier::where('id', $dossierId)->update(['statut' => Dossier::STATUT_DOSSIER_ENVOYER]);

            $dataCneddt = $r['result']['data'] ?? [];
            $shortcode = DossierService::cneddtCashierShortCodeFromResponse(is_array($dataCneddt) ? $dataCneddt : null);
            $phone = $dossier->candidat?->personne?->utilisateur?->telephone
                ?? $dossier->candidat?->personne?->contact
                ?? null;
            if (empty($phone)) {
                Log::warning('[SMS] Transfert CNEDDT : pas de numéro pour le candidat', ['dossier_id' => $dossierId]);
                continue;
            }
            $msg = ($typeDemandeNamesById[$dossier->type_demande_id] ?? null) === 'RENOUVELLEMENT'
                ? 'DGTT: Votre demande de renouvellement a été transmise au CNEDDT.'
                : 'DGTT: Votre dossier a été transmis au CNEDDT pour la prise des empreintes biométriques.';
            if ($shortcode !== '') {
                $msg .= ' Code dossier: ' . $shortcode . '.';
            }
            if (strlen($msg) > 160) {
                $msg = substr($msg, 0, 157) . '...';
            }
            SendAirtelSmsJob::dispatch($phone, $msg, 'transfert_cneddt:' . $dossierId);
        }

        if ($successCount > 0) {
            Cache::tags(['dossiers'])->flush();
        }

        return response()->json([
            'success' => $successCount > 0,
            'message' => $message,
            'total' => $total,
            'sent_count' => $successCount,
            'skipped' => $skipped,
            'results' => $results,
        ], 200);
    }

    /**
     * Construit le payload CNEDDT pour un dossier (format attendu par l'API externe).
     * Corps POST : `{ "data": { "dossier_id": "<dossiers.id>", ... } }` — `dossier_id` est toujours l’UUID du dossier en base.
     *
     * @param  mixed  $typeDemandeNamesById  collection ou tableau id => name (évite des requêtes SQL en boucle), ou null
     * @return array<string, mixed>|null  null si données insuffisantes pour construire le corps
     */
    private function buildPayloadForTransfert(Dossier $dossier, string $typeDemandeId, $typeDemandeNamesById = null): ?array
    {
        $operationType = $typeDemandeNamesById !== null
            ? ($typeDemandeNamesById[$typeDemandeId] ?? null)
            : TypeDemande::where('id', $typeDemandeId)->value('name');

        if (!$operationType || !$dossier->candidat?->personne) {
            return null;
        }

        $typePermisCode = $this->resolveTypePermisCodeForTransfert($dossier, $operationType);
        if (!$typePermisCode) {
            return null;
        }

        $personne = $dossier->candidat->personne;
        $email = $personne->email ?? $personne->utilisateur?->email ?? null;

        $data = [
            'dossier_id' => $dossier->id,
            'first_name' => $personne->prenom,
            'last_name' => $personne->nom,
            'operation_type' => $operationType,
            'birth_date' => $dossier->candidat->date_naissance?->toDateString(),
            'birth_place' => $dossier->candidat->lieu_naissance,
            'address' => $personne->adresse,
            'phone' => $personne->contact,
            'email' => $email !== '' && $email !== null ? $email : null,
            'genre' => $dossier->candidat->genre,
            'cni_number' => $dossier->candidat->type_piece,
            'niu_number' => $dossier->candidat->numero_piece,
            'nationality' => $dossier->candidat->nationalite,
            // Par défaut : une seule catégorie avec la classe principale (fallback si data_categorie est vide)
            'categorie_vehicule' => [
                ['classe' => $typePermisCode],
            ],
        ];

        $numeroPermis = $dossier->numero_permis;
        $lastFiveChar = $numeroPermis ? substr($numeroPermis, -5) : '';

        // Si data_categorie est renseigné et que ce n'est PAS un nouveau permis,
        // on AJOUTE les objets de data_categorie APRES la catégorie de base.
        // Exemple data_categorie en base :
        // [
        //   {"classe": "B", "ville": "45874", "codification_code": "B", "valable_du": "2025-02-03", "jusqu_au": null},
        //   {"classe": "C", "ville": "Libreville", "codification_code": "12340", "valable_du": "2025-02-03", "jusqu_au": "2030-02-03"}
        // ]
        // Certaines données historiques stockent chaque ligne comme chaîne JSON au lieu d'objet : on normalise.
        if ($operationType !== 'NOUVEAUPERMIS' && !empty($dossier->data_categorie) && is_array($dossier->data_categorie)) {
            // On part de la structure existante (première catégorie déjà présente)
            $categoriesPayload = $data['categorie_vehicule'];
            foreach ($dossier->data_categorie as $cat) {
                if (is_string($cat)) {
                    $decoded = json_decode($cat, true);
                    $cat = is_array($decoded) ? $decoded : null;
                }
                if (!is_array($cat)) {
                    continue;
                }
                $categoriesPayload[] = [
                    'classe' => $cat['classe'] ?? $typePermisCode,
                    'ville' => $cat['ville'] ?? $dossier->lieu_de_dobtention_du_permis,
                    'codification_code' => $cat['codification_code'] ?? $lastFiveChar,
                    'valable_du' => $cat['valable_du'] ?? $dossier->date_de_dobtention_du_permis,
                    'jusqu_au' => $cat['jusqu_au'] ?? $dossier->date_expiration,
                ];
            }
            if (!empty($categoriesPayload)) {
                // Deduplication par classe : évite les doublons ex. "B" ajouté à la fois
                // (catégorie de base + entrée déjà présente dans data_categorie).
                // On conserve l'entrée la plus "complète" (qui a le plus de champs non vides).
                $bestByClasse = [];
                $bestScoreByClasse = [];
                foreach ($categoriesPayload as $cat) {
                    if (!is_array($cat)) {
                        continue;
                    }
                    $classe = trim((string)($cat['classe'] ?? ''));
                    if ($classe === '') {
                        continue;
                    }

                    $score = 0;
                    foreach (['ville', 'codification_code', 'valable_du', 'jusqu_au'] as $field) {
                        if (array_key_exists($field, $cat) && $cat[$field] !== null && $cat[$field] !== '') {
                            $score++;
                        }
                    }

                    if (!isset($bestScoreByClasse[$classe]) || $score > $bestScoreByClasse[$classe]) {
                        $bestScoreByClasse[$classe] = $score;
                        $bestByClasse[$classe] = $cat;
                    }
                }

                $data['categorie_vehicule'] = array_values($bestByClasse);
            }
        }

        switch ($operationType) {
            case 'NOUVEAUPERMIS':
                $provinceCode = $dossier->autoEcole?->province?->code;
                if ($provinceCode) {
                    $data[$provinceCode] = true;
                }
                break;
            case 'DUPLICATA':
            case 'CONVERSION':
            case 'RENOUVELLEMENT':
                $data['numero_driving_license'] = $dossier->numero_permis;
                // Si data_categorie est vide, on garde l'ancien comportement (1 seule catégorie)
                if (empty($dossier->data_categorie)) {
                    $data['categorie_vehicule'][0] = [
                        'classe' => $typePermisCode,
                        'ville' => $dossier->lieu_de_dobtention_du_permis,
                        'codification_code' => $lastFiveChar,
                        'valable_du' => $dossier->date_de_dobtention_du_permis,
                        'jusqu_au' => $dossier->date_expiration,
                    ];
                }
                break;
            case 'FICHEENREGISTREMENT':
                $data['numero_driving_license_origine'] = $dossier->numero_origine_permis;
                break;
            case 'DUPLICATAFICHEENREGISTREMENT':
                $data['numero_driving_license'] = $dossier->numero_permis;
                $data['numero_driving_license_origine'] = $dossier->numero_origine_permis;
                // Si data_categorie est vide, on garde l'ancien comportement (1 seule catégorie)
                if (empty($dossier->data_categorie)) {
                    $data['categorie_vehicule'][0] = [
                        'classe' => $typePermisCode,
                        'ville' => $dossier->lieu_de_dobtention_du_permis,
                        'codification_code' => $lastFiveChar,
                        'valable_du' => $dossier->date_de_dobtention_du_permis,
                        'jusqu_au' => $dossier->date_expiration,
                    ];
                }
                break;
        }

        // Corps côté CNEDDT (JSON) : l’API attend souvent `operation_type` / `dossier_id` en racine
        // ET le détail dans `data` — en plus, le client HTTP doit envoyer en `application/json` (voir DossierService::asJson()).
        $dataPourCneddt = $data;
        $dataPourCneddt = array_merge(
            ['dossier_id' => (string) $dossier->id],
            $dataPourCneddt
        );
        $dossierId = (string) $dossier->id;
        $op = trim((string) $operationType);

        $root = [
            'dossier_id' => $dossierId,
            'operation_type' => $op,
        ];

        // Le CNEDDT persiste souvent en ne lisant que la racine : mêmes clés que dans `data`
        // (ex. `genre` NOT NULL sur driving_licenses côté CNEDDT — sinon 500 SQL).
        $scalarsPourRacine = [
            'numero_driving_license',
            'numero_driving_license_origine',
            'genre',
            'first_name',
            'last_name',
            'birth_date',
            'birth_place',
            'address',
            'phone',
            'email',
            'nationality',
            'niu_number',
            'cni_number',
        ];
        foreach ($scalarsPourRacine as $k) {
            if (! array_key_exists($k, $dataPourCneddt)) {
                continue;
            }
            $v = $dataPourCneddt[$k];
            if ($v === null || $v === '') {
                continue;
            }
            $root[$k] = is_scalar($v) || $v instanceof \Stringable ? (string) $v : $v;
        }

        if (
            array_key_exists('categorie_vehicule', $dataPourCneddt)
            && is_array($dataPourCneddt['categorie_vehicule'])
            && $dataPourCneddt['categorie_vehicule'] !== []
        ) {
            $root['categorie_vehicule'] = $dataPourCneddt['categorie_vehicule'];
        }

        $root['data'] = $dataPourCneddt;

        return $root;
    }

    /**
     * Code type permis pour le payload CNEDDT : formation (nouveau permis) ou référentiel / data_categorie (autres opérations).
     */
    /**
     * Dossier RENOUVELLEMENT non encore transmis au CNEDDT pour le même numéro de permis (tirets ignorés).
     *
     * @param  array<string, mixed>  $data  Données validées du dossier à créer
     */
    private function findRenouvellementEnCours(array $data): ?Dossier
    {
        $typeDemandeId = $data['type_demande_id'] ?? null;
        $numeroPermis = strtoupper(str_replace('-', '', trim((string) ($data['numero_permis'] ?? ''))));
        if (!$typeDemandeId || $numeroPermis === '') {
            return null;
        }
        if (TypeDemande::where('id', $typeDemandeId)->value('name') !== 'RENOUVELLEMENT') {
            return null;
        }

        return Dossier::where('type_demande_id', $typeDemandeId)
            ->whereRaw("UPPER(REPLACE(numero_permis, '-', '')) = ?", [$numeroPermis])
            ->where(fn($q) => $q->whereNull('statut')->orWhere('statut', '!=', Dossier::STATUT_DOSSIER_ENVOYER))
            ->latest()
            ->first();
    }

    /**
     * Renouvellement : nouvelles dates de validité des catégories, à partir du jour du paiement.
     * Durée : 2 ans si le titulaire a plus de 59 ans, 5 ans sinon.
     * Idempotent : une catégorie déjà marquée `renouvele` n'est pas recalculée (ancienne validité conservée).
     */
    private function appliquerNouvellesDatesRenouvellement(Dossier $dossier): void
    {
        if (empty($dossier->data_categorie) || !is_array($dossier->data_categorie)) {
            return;
        }
        if (TypeDemande::where('id', $dossier->type_demande_id)->value('name') !== 'RENOUVELLEMENT') {
            return;
        }

        $naissance = $dossier->candidat?->date_naissance;
        $dureeAns = ($naissance && $naissance->age > 59) ? 2 : 5;
        $debut = now()->startOfDay();
        $fin = $debut->copy()->addYears($dureeAns);

        $modifie = false;
        $lignes = [];
        foreach ($dossier->data_categorie as $cat) {
            $ligne = is_string($cat) ? json_decode($cat, true) : $cat;
            if (!is_array($ligne) || !empty($ligne['renouvele'])) {
                $lignes[] = $cat;
                continue;
            }
            $ligne['ancienne_validite'] = $ligne['jusqu_au'] ?? null;
            $ligne['valable_du'] = $debut->toDateString();
            $ligne['jusqu_au'] = $fin->toDateString();
            $ligne['duree_ans'] = $dureeAns;
            $ligne['renouvele'] = true;
            $lignes[] = is_string($cat) ? json_encode($ligne, JSON_UNESCAPED_UNICODE) : $ligne;
            $modifie = true;
        }

        if ($modifie) {
            $dossier->forceFill(['data_categorie' => $lignes, 'date_expiration' => $fin->toDateString()])->save();
            Cache::tags(['dossiers'])->flush();
            Log::info('Renouvellement : nouvelles dates appliquées', [
                'dossier_id' => $dossier->id,
                'duree_ans' => $dureeAns,
                'jusqu_au' => $fin->toDateString(),
            ]);
        }
    }

    private function resolveTypePermisCodeForTransfert(Dossier $dossier, string $operationType): ?string
    {
        if ($operationType === 'NOUVEAUPERMIS') {
            return $dossier->formation?->typePermis?->code;
        }

        $code = $dossier->referentiel?->code;
        if ($code !== null && $code !== '') {
            return (string) $code;
        }

        return $this->firstClasseFromDataCategorie($dossier);
    }

    /**
     * Première classe renseignée dans data_categorie (chaîne JSON ou objet).
     */
    private function firstClasseFromDataCategorie(Dossier $dossier): ?string
    {
        if (empty($dossier->data_categorie) || !is_array($dossier->data_categorie)) {
            return null;
        }

        foreach ($dossier->data_categorie as $cat) {
            if (is_string($cat)) {
                $decoded = json_decode($cat, true);
                $cat = is_array($decoded) ? $decoded : null;
            }
            if (!is_array($cat)) {
                continue;
            }
            $classe = trim((string) ($cat['classe'] ?? ''));
            if ($classe !== '') {
                return $classe;
            }
        }

        return null;
    }

    /**
     * Met en file l'email de notification biométrie pour un dossier.
     */
    private function queueBiometrieEmailForDossier(Dossier $dossier, ?string $email = null): void
    {
        $personne = $dossier->candidat?->personne;
        if (!$personne) {
            return;
        }
        $email = $email ?? $personne->email;
        if (empty($email)) {
            return;
        }
        $emailData = [
            'name' => trim($personne->nom . ' ' . $personne->prenom),
            'email' => $email,
            'titre' => 'Biometrie',
            'message' => 'Nous vous informons que la testation biométrique de votre permis a été réussie avec succès. Votre dossier a été transmis au CNEDDT pour les étapes suivantes de traitement.',
        ];
        Mail::to($email)->queue(new ResultatBiometrieEmailService($emailData));
    }

    /**
     * Ouvrir (verrouiller) un dossier pour le traitement par l'agent connecté.
     * Si le dossier est déjà ouvert par un autre agent et non expiré → 423 avec message.
     * Déverrouillage automatique après LOCK_TIMEOUT_MINUTES d'inactivité.
     */
    #[ScrambleResponse(403, 'Agent avec centre_id : accès refusé si le dossier n\'est pas de son centre.')]
    #[ScrambleResponse(423, 'Dossier déjà ouvert par un autre agent (message détaillé dans le body).')]
    public function open(Dossier $dossier): JsonResponse
    {
        $forbidden = CentreScopeHelper::ensureAgentCanAccessDossier($dossier);
        if ($forbidden) {
            return $forbidden;
        }

        $user = Auth::user();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Non authentifié.',
            ], 401);
        }
        if ($user->role === 'ROLE_CANDIDAT') {
            return response()->json([
                'success' => false,
                'message' => 'Le candidat n\'est pas concerné par l\'ouverture d\'un dossier ; seuls les agents qui traitent les dossiers des candidats peuvent l\'ouvrir.',
            ], 403);
        }

        $dossier->load(['openedByUser.personne']);

        if ($dossier->isLockedByOther($user->id)) {
            $agentName = 'Un agent';
            if ($dossier->openedByUser && $dossier->openedByUser->personne) {
                $agentName = trim($dossier->openedByUser->personne->nom . ' ' . $dossier->openedByUser->personne->prenom) ?: $dossier->openedByUser->email;
            } else {
                $agentName = $dossier->openedByUser->email ?? $agentName;
            }
            $heure = $dossier->opened_at ? $dossier->opened_at->format('d/m/Y à H:i') : '';

            return response()->json([
                'success' => false,
                'message' => "Ce dossier est actuellement traité par {$agentName} depuis {$heure}.",
                'opened_by' => $dossier->opened_by,
                'opened_at' => $dossier->opened_at?->toIso8601String(),
            ], 423);
        }

        $dossier->update([
            'is_locked' => true,
            'opened_by' => $user->id,
            'opened_at' => now(),
        ]);

        $dossier->load(['openedByUser.personne', 'candidat.personne', 'autoEcole', 'formation', 'province', 'centre']);

        return response()->json([
            'success' => true,
            'message' => 'Dossier ouvert (verrouillé) pour traitement.',
            'data' => new DossierResource($dossier),
        ], 200);
    }

    /**
     * Fermer (déverrouiller) un dossier. Autorisé pour l'agent qui a ouvert ou pour un admin.
     */
    #[ScrambleResponse(403, 'Agent avec centre_id : accès refusé ou vous n\'êtes pas l\'agent ayant ouvert le dossier.')]
    public function close(Dossier $dossier): JsonResponse
    {
        $forbidden = CentreScopeHelper::ensureAgentCanAccessDossier($dossier);
        if ($forbidden) {
            return $forbidden;
        }

        $user = Auth::user();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Non authentifié.',
            ], 401);
        }
        if ($user->role === 'ROLE_CANDIDAT') {
            return response()->json([
                'success' => false,
                'message' => 'Le candidat n\'est pas concerné par la fermeture d\'un dossier ; seuls les agents qui traitent les dossiers des candidats peuvent le fermer.',
            ], 403);
        }

        $canClose = $user->role === 'admin' || $dossier->opened_by === $user->id;
        if (!$canClose && $dossier->is_locked && $dossier->opened_by) {
            return response()->json([
                'success' => false,
                'message' => 'Seul l\'agent ayant ouvert le dossier (ou un admin) peut le fermer.',
            ], 403);
        }

        $dossier->update([
            'is_locked' => false,
            'opened_by' => null,
            'opened_at' => null,
        ]);

        $dossier->load(['candidat.personne', 'autoEcole', 'formation', 'province', 'centre']);

        return response()->json([
            'success' => true,
            'message' => 'Dossier fermé (déverrouillé).',
            'data' => new DossierResource($dossier),
        ], 200);
    }

    /**
     * Récupère tous les dossier en attente de paiement
     * verifie le statut de paiement auprès de l'API de Airtel en utilisant le code de paiement associé à chaque dossier
     * si le paiement est confirmé, enregistre une ligne dans la table paiement avec les informations
     */

    public function verifierPaiementsEnAttente(): JsonResponse
    {
        // Le middleware auth.token protège déjà cette route.
        // On ne limite plus à admin : tout utilisateur authentifié peut déclencher
        // la vérification et la mise à jour des paiements en attente.
        $this->paynalaService->dossierPendingPayments();

        return response()->json([
            'success' => true,
            'message' => 'Vérification des paiements en attente exécutée.',
        ]);
    }

    /**
     * Vérifie et traite le paiement pour un dossier uniquement.
     * Le frontend appelle cet endpoint quand l'utilisateur est sur un dossier.
     */
    #[Endpoint(
        title: 'Vérifier paiement (1 dossier)',
        description: 'Vérifie le paiement Airtel Money / Paynala pour un dossier spécifique. Le frontend appelle cet endpoint depuis la page détail d\'un dossier. Aucun body n\'est requis : le backend utilise `dossiers.code_paiement` pour `lookup-payment`. Conditions pour traiter un paiement : réponse `success: true`, `count` > 0, `data` présent, `data.payments[0].status === "SUCCESS"`. Sinon `paid: false`. Puis ligne `paiements` (idempotent) et statut dossier complété.'
    )]
    #[ScrambleResponse(200, 'Paiement trouvé et traité, ou paiement non confirmé (paid=false). Retourne success=true.')]
    #[ScrambleResponse(422, 'Échec de vérification Paynala, ou dossier sans code_paiement (success=false).')]
    #[ScrambleResponse(403, 'Accès refusé (agent centre : dossier d\'un autre centre).')]
    public function checkPaiement(Dossier $dossier): JsonResponse
    {
        $forbidden = CentreScopeHelper::ensureAgentCanAccessDossier($dossier);
        if ($forbidden) {
            return $forbidden;
        }

        $result = $this->paynalaService->checkAndProcessPaymentForDossier($dossier->load('candidat.personne'));

        if (($result['paid'] ?? false) === true) {
            $this->appliquerNouvellesDatesRenouvellement($dossier->fresh(['candidat']));
        }

        return response()->json($result, ($result['success'] ?? false) ? 200 : 422);
    }

    public function historiquePayement()
    {
        if (!Auth::check()) {
            return;
        }
        return $this->paynalaService->historiquePayement();
    }

    public function testWs()
    {
        $this->webSocketService->statutDossierToPayWs('Le message a bien été broadcasté');
    }

    /**
     * Aligne province_id sur la province du référentiel centre (liaison API centre–province : parent_id du centre).
     */
    private function applyProvinceIdFromCentre(array &$data, string $centreId): void
    {
        $data['province_id'] = Referentiel::query()->whereKey($centreId)->value('parent_id');
    }


    #[Endpoint(title: "Reception d'un dossier depuis le CNEDDT", description: 'Le endpoint que le CNEDDT utilisera pour envoyer un dossier au CNEPC, ')]
    #[ScrambleResponse(200, 'Statut du dossier mis à jour.')]
    #[ScrambleResponse(401, 'Accès refusé si le header n\'est pas bien configuré.')]
    #[ScrambleResponse(404, 'Dossier non trouvé.')]
    #[ScrambleResponse(422, "Erreur du format de l'objet reçu")]
    public function getDossierFromCneddt(Request $request)
    {
        $result = $this->dossierService->receiveFromCneddt(
            $request->all(),
            $request->header('X-API-KEY')
        );

        $status = $result['status'] ?? 200;
        unset($result['status']);

        return response()->json($result, $status);
    }
}
