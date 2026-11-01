<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Helpers\AuthHelper;
use App\Http\Resources\UtilisateurResource;
use App\Models\Utilisateur;
use App\Services\UtilisateurService;
use Dedoc\Scramble\Attributes\Endpoint;
use Dedoc\Scramble\Attributes\Group;
use Dedoc\Scramble\Attributes\QueryParameter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;

#[Group('Utilisateurs', description: 'Liste et gestion des utilisateurs. Endpoints dédiés : candidats (ROLE_CANDIDAT) et agents (rôles différents du candidat) avec filtres et pagination.')]
class UtilisateurController extends Controller
{
    protected $utilisateurService;

    public function __construct(UtilisateurService $utilisateurService)
    {
        $this->utilisateurService = $utilisateurService;
    }

    #[Endpoint(title: 'Liste des utilisateurs', description: 'Liste paginée via UtilisateurService. Filtres optionnels role, email, telephone.')]
    #[QueryParameter('role', description: 'Filtrer par rôle', type: 'string', required: false)]
    #[QueryParameter('email', description: 'Filtrer par email', type: 'string', required: false)]
    #[QueryParameter('telephone', description: 'Filtrer par téléphone', type: 'string', required: false)]
    #[QueryParameter('per_page', description: 'Nombre d\'éléments par page (1-100, défaut 15)', type: 'integer', required: false)]
    #[QueryParameter('page', description: 'Numéro de page', type: 'integer', required: false)]
    #[\Dedoc\Scramble\Attributes\Response(200, 'success, message, data (UtilisateurResource), meta (current_page, per_page, total, last_page).')]
    public function index(Request $request): JsonResponse
    {
        return $this->utilisateurService->index($request);
    }

    /**
     * Liste des utilisateurs avec rôle ROLE_CANDIDAT (ou "candidat").
     * Filtres : search (email, téléphone, nom, prénom), email, telephone. Pagination : per_page (défaut 15, max 100), page.
     */
    #[Endpoint(title: 'Liste des candidats', description: 'Liste paginée des utilisateurs ayant le rôle ROLE_CANDIDAT. Filtres : search, email, telephone. Pagination : per_page (1-100), page.')]
    #[QueryParameter('search', description: 'Recherche sur email, téléphone, nom ou prénom (personne)', type: 'string', required: false)]
    #[QueryParameter('email', description: 'Filtrer par email (exact ou partiel selon implémentation)', type: 'string', required: false)]
    #[QueryParameter('telephone', description: 'Filtrer par téléphone', type: 'string', required: false)]
    #[QueryParameter('per_page', description: 'Nombre d\'éléments par page (1-100, défaut 15)', type: 'integer', required: false)]
    #[QueryParameter('page', description: 'Numéro de page', type: 'integer', required: false)]
    public function indexCandidats(Request $request): JsonResponse
    {
        $cacheKey = 'utilisateurs:candidats:' . md5(json_encode($request->all()));
        $data = Cache::tags(['utilisateurs'])->remember($cacheKey, 3600, function () use ($request) {
            $perPage = min(max((int) $request->input('per_page', 15), 1), 100);

            $query = Utilisateur::query()
                ->with('personne')
                ->where(function ($q) {
                    $q->where('role', 'ROLE_CANDIDAT')->orWhere('role', 'candidat');
                });

            if ($search = $request->input('search')) {
                $term = '%' . $search . '%';
                $query->where(function ($q) use ($term) {
                    $q->where('email', 'ilike', $term)
                        ->orWhere('telephone', 'ilike', $term)
                        ->orWhereHas('personne', function ($p) use ($term) {
                            $p->where('nom', 'ilike', $term)->orWhere('prenom', 'ilike', $term);
                        });
                });
            }
            if ($request->filled('email')) {
                $query->where('email', 'ilike', '%' . $request->input('email') . '%');
            }
            if ($request->filled('telephone')) {
                $query->where('telephone', 'ilike', '%' . $request->input('telephone') . '%');
            }

            $paginator = $query->latest()->paginate($perPage);

            return [
                'data' => UtilisateurResource::collection($paginator)->resolve(),
                'meta' => [
                    'current_page' => $paginator->currentPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                    'last_page' => $paginator->lastPage(),
                    'from' => $paginator->firstItem(),
                    'to' => $paginator->lastItem(),
                ],
                'links' => [
                    'first' => $paginator->url(1),
                    'last' => $paginator->url($paginator->lastPage()),
                    'prev' => $paginator->previousPageUrl(),
                    'next' => $paginator->nextPageUrl(),
                ],
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Liste des candidats récupérée avec succès.',
            'data' => $data['data'],
            'meta' => $data['meta'],
            'links' => $data['links'],
        ]);
    }

    /**
     * Liste des utilisateurs dont le rôle est différent de ROLE_CANDIDAT (admin, responsable_auto_ecole, etc.).
     * Filtres : search, role, centre_id, email, telephone. Pagination : per_page (défaut 15, max 100), page.
     */
    #[Endpoint(title: 'Liste des agents (non candidats)', description: 'Liste paginée des utilisateurs dont le rôle est différent de ROLE_CANDIDAT. Filtres : search, role, centre_id, email, telephone. Pagination : per_page (1-100), page.')]
    #[QueryParameter('search', description: 'Recherche sur email, téléphone, nom ou prénom (personne)', type: 'string', required: false)]
    #[QueryParameter('role', description: 'Filtrer par rôle (ex. admin, responsable_auto_ecole)', type: 'string', required: false)]
    #[QueryParameter('centre_id', description: 'Filtrer par centre (UUID référentiel)', type: 'string', required: false)]
    #[QueryParameter('email', description: 'Filtrer par email (partiel)', type: 'string', required: false)]
    #[QueryParameter('telephone', description: 'Filtrer par téléphone', type: 'string', required: false)]
    #[QueryParameter('per_page', description: 'Nombre d\'éléments par page (1-100, défaut 15)', type: 'integer', required: false)]
    #[QueryParameter('page', description: 'Numéro de page', type: 'integer', required: false)]
    public function indexAgents(Request $request): JsonResponse
    {
        $cacheKey = 'utilisateurs:agents:' . md5(json_encode($request->all()));
        $data = Cache::tags(['utilisateurs'])->remember($cacheKey, 3600, function () use ($request) {
            $perPage = min(max((int) $request->input('per_page', 15), 1), 100);

            $query = Utilisateur::query()
                ->with(['personne', 'centre'])
                ->where(function ($q) {
                    $q->where('role', '!=', 'ROLE_CANDIDAT')->where('role', '!=', 'candidat');
                });

            if ($search = $request->input('search')) {
                $term = '%' . $search . '%';
                $query->where(function ($q) use ($term) {
                    $q->where('email', 'ilike', $term)
                        ->orWhere('telephone', 'ilike', $term)
                        ->orWhereHas('personne', function ($p) use ($term) {
                            $p->where('nom', 'ilike', $term)->orWhere('prenom', 'ilike', $term);
                        });
                });
            }
            if ($request->filled('role')) {
                $query->where('role', $request->input('role'));
            }
            if ($request->filled('centre_id')) {
                $query->where('centre_id', $request->input('centre_id'));
            }
            if ($request->filled('email')) {
                $query->where('email', 'ilike', '%' . $request->input('email') . '%');
            }
            if ($request->filled('telephone')) {
                $query->where('telephone', 'ilike', '%' . $request->input('telephone') . '%');
            }

            $paginator = $query->latest()->paginate($perPage);

            return [
                'data' => UtilisateurResource::collection($paginator)->resolve(),
                'meta' => [
                    'current_page' => $paginator->currentPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                    'last_page' => $paginator->lastPage(),
                    'from' => $paginator->firstItem(),
                    'to' => $paginator->lastItem(),
                ],
                'links' => [
                    'first' => $paginator->url(1),
                    'last' => $paginator->url($paginator->lastPage()),
                    'prev' => $paginator->previousPageUrl(),
                    'next' => $paginator->nextPageUrl(),
                ],
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Liste des agents récupérée avec succès.',
            'data' => $data['data'],
            'meta' => $data['meta'],
            'links' => $data['links'],
        ]);
    }

    #[Endpoint(
        title: 'Modifier un utilisateur',
        description: 'Met à jour un utilisateur (email, téléphone, rôle, centre_id). Auth requise. Email/téléphone restent uniques si fournis. Optionnel : met aussi à jour la personne liée (nom, prenom, contact, adresse, personne_email).'
    )]
    #[\Dedoc\Scramble\Attributes\Response(200, 'Utilisateur mis à jour (success=true, data=UtilisateurResource).')]
    #[\Dedoc\Scramble\Attributes\Response(401, 'Non authentifié (success=false).')]
    #[\Dedoc\Scramble\Attributes\Response(422, 'Validation échouée (email/téléphone déjà pris, centre_id invalide, etc.).')]
    public function update(Request $request, Utilisateur $utilisateur): JsonResponse
    {
        $authUser = AuthHelper::getAuthenticatedUser($request);
        if (!$authUser) {
            return response()->json([
                'success' => false,
                'message' => 'Non authentifié.',
            ], 401);
        }

        $data = $request->validate([
            'email' => ['nullable', 'email', Rule::unique('utilisateurs', 'email')->ignore($utilisateur->id)],
            'telephone' => ['nullable', 'string', Rule::unique('utilisateurs', 'telephone')->ignore($utilisateur->id)],
            'role' => ['nullable', 'string'],
            'centre_id' => ['nullable', 'uuid', 'exists:referentiels,id'],

            // Champs personne (optionnels)
            'nom' => ['nullable', 'string'],
            'prenom' => ['nullable', 'string'],
            'contact' => ['nullable', 'string'],
            'adresse' => ['nullable', 'string'],
            'personne_email' => ['nullable', 'email'],
        ]);

        $utilisateur->fill(collect($data)->only(['email', 'telephone', 'role', 'centre_id'])->toArray());
        $utilisateur->save();

        if ($utilisateur->relationLoaded('personne') === false) {
            $utilisateur->load('personne');
        }
        if ($utilisateur->personne) {
            $personneData = collect($data)->only(['nom', 'prenom', 'contact', 'adresse'])->toArray();
            if (array_key_exists('personne_email', $data)) {
                $personneData['email'] = $data['personne_email'];
            }
            if (!empty($personneData)) {
                $utilisateur->personne->fill($personneData);
                $utilisateur->personne->save();
            }
        }

        $utilisateur->load(['personne', 'centre']);
        Cache::tags(['utilisateurs'])->flush();

        return response()->json([
            'success' => true,
            'message' => 'Utilisateur mis à jour.',
            'data' => new UtilisateurResource($utilisateur),
        ], 200);
    }

    #[Endpoint(
        title: 'Supprimer un utilisateur',
        description: 'Supprime un utilisateur. Auth requise. Interdit de supprimer son propre compte. La personne liée est supprimée via cascade.'
    )]
    #[\Dedoc\Scramble\Attributes\Response(200, 'Utilisateur supprimé (success=true).')]
    #[\Dedoc\Scramble\Attributes\Response(401, 'Non authentifié (success=false).')]
    #[\Dedoc\Scramble\Attributes\Response(422, 'Suppression impossible (ex: suppression de son propre compte).')]
    public function destroy(Request $request, Utilisateur $utilisateur): JsonResponse
    {
        $authUser = AuthHelper::getAuthenticatedUser($request);
        if (!$authUser) {
            return response()->json([
                'success' => false,
                'message' => 'Non authentifié.',
            ], 401);
        }

        if ($authUser->id === $utilisateur->id) {
            return response()->json([
                'success' => false,
                'message' => 'Suppression impossible : vous ne pouvez pas supprimer votre propre compte.',
            ], 422);
        }

        $utilisateur->delete();
        Cache::tags(['utilisateurs'])->flush();

        return response()->json([
            'success' => true,
            'message' => 'Utilisateur supprimé.',
        ], 200);
    }
}