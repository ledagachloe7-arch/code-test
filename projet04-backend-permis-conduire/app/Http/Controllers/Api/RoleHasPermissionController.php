<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RoleHasPermission;
use App\Http\Requests\RoleHasPermission\StoreRoleHasPermissionRequest;
use App\Http\Requests\RoleHasPermission\UpdateRoleHasPermissionRequest;
use Dedoc\Scramble\Attributes\Endpoint;
use Dedoc\Scramble\Attributes\Group;
use Dedoc\Scramble\Attributes\PathParameter;
use Dedoc\Scramble\Attributes\QueryParameter;
use Dedoc\Scramble\Attributes\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

#[Group('Rôles et Permissions', description: 'Gestion des rôles et de leurs permissions (table role_has_permissions)')]
class RoleHasPermissionController extends Controller
{
    #[Endpoint(operationId: 'listRoleHasPermissions', title: 'Liste des rôles et permissions', description: 'Retourne la liste paginée des rôles avec leurs permissions (table role_has_permissions).')]
    #[QueryParameter('per_page', description: 'Nombre d\'éléments par page (1-100, défaut 15)', type: 'integer', required: false)]
    #[QueryParameter('page', description: 'Numéro de page', type: 'integer', required: false)]
    #[Response(description: 'success, data (page courante), meta (current_page, per_page, total, last_page)', type: 'array{success: bool, data: array, meta: object}')]
    public function index(Request $request): JsonResponse
    {
        $cacheKey = 'role_has_permissions:' . md5(json_encode($request->all()));
        $data = Cache::tags(['role_has_permissions'])->remember($cacheKey, 3600, function () use ($request) {
            $paginator = RoleHasPermission::orderBy('role')->paginate($this->perPage($request));
            return [
                'data' => $paginator->items(),
                'meta' => [
                    'current_page' => $paginator->currentPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                    'last_page' => $paginator->lastPage(),
                ],
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data['data'],
            'meta' => $data['meta'],
        ]);
    }

    /** Retourne la ligne complète (rôle + permissions) pour le rôle donné. */
    #[Endpoint(operationId: 'getRoleHasPermissionByRole', title: 'Rôle et permissions par nom', description: 'Retourne la ligne complète (rôle + permissions) pour le rôle donné (ex. ROLE_CANDIDAT, ROLE_ADMIN).')]
    #[PathParameter('role', description: 'Nom du rôle (ex: ROLE_CANDIDAT, ROLE_ADMIN)', type: 'string', example: 'ROLE_CANDIDAT')]
    #[Response(description: 'Rôle et permissions trouvés', type: 'array{success: bool, data: object}')]
    #[Response(status: 404, description: 'Rôle non trouvé', type: 'array{success: bool, message: string}')]
    public function showByRole(string $role): JsonResponse
    {
        $item = Cache::tags(['role_has_permissions'])->remember("role_has_permissions:by_role:{$role}", 3600, function () use ($role) {
            return RoleHasPermission::where('role', $role)->first();
        });

        if (!$item) {
            return response()->json([
                'success' => false,
                'message' => 'Aucun enregistrement trouvé pour ce rôle.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $item,
        ]);
    }

    /** Retourne un rôle et ses permissions par son identifiant UUID. */
    #[Endpoint(operationId: 'getRoleHasPermission', title: 'Détail rôle par UUID', description: 'Retourne un rôle et ses permissions par son identifiant UUID.')]
    #[PathParameter('role_has_permission', description: 'UUID du rôle', type: 'string', format: 'uuid')]
    #[Response(description: 'Rôle et permissions', type: 'array{success: bool, data: object}')]
    public function show(RoleHasPermission $role_has_permission): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $role_has_permission,
        ]);
    }

    /** Ajoute un nouveau rôle avec son tableau de permissions (JSON). Le rôle doit être unique. */
    #[Endpoint(operationId: 'createRoleHasPermission', title: 'Créer un rôle et ses permissions', description: 'Ajoute un nouveau rôle avec son tableau de permissions (JSON). Le rôle doit être unique.')]
    #[Response(201, 'Rôle créé', type: 'array{success: bool, message: string, data: object}')]
    #[Response(422, 'Erreur de validation', type: 'array{success: bool, message: string, errors: object}')]
    public function store(StoreRoleHasPermissionRequest $request): JsonResponse
    {
        $item = RoleHasPermission::create($request->validated());
        Cache::tags(['role_has_permissions'])->flush();
        return response()->json([
            'success' => true,
            'message' => 'Rôle et permissions créés avec succès.',
            'data' => $item,
        ], 201);
    }

    /** Met à jour un rôle existant (role et/ou permission). */
    #[Endpoint(operationId: 'updateRoleHasPermission', title: 'Mettre à jour un rôle', description: 'Met à jour un rôle existant (role et/ou permissions).')]
    #[PathParameter('role_has_permission', description: 'UUID du rôle à modifier', type: 'string', format: 'uuid')]
    #[Response(description: 'Rôle mis à jour', type: 'array{success: bool, message: string, data: object}')]
    #[Response(422, 'Erreur de validation', type: 'array{success: bool, message: string, errors: object}')]
    public function update(UpdateRoleHasPermissionRequest $request, RoleHasPermission $role_has_permission): JsonResponse
    {
        $role_has_permission->update($request->validated());
        Cache::tags(['role_has_permissions'])->flush();
        return response()->json([
            'success' => true,
            'message' => 'Rôle et permissions mis à jour avec succès.',
            'data' => $role_has_permission->fresh(),
        ]);
    }

    /** Supprime définitivement un rôle et ses permissions. */
    #[Endpoint(operationId: 'deleteRoleHasPermission', title: 'Supprimer un rôle', description: 'Supprime définitivement un rôle et ses permissions.')]
    #[PathParameter('role_has_permission', description: 'UUID du rôle à supprimer', type: 'string', format: 'uuid')]
    #[Response(description: 'Rôle supprimé', type: 'array{success: bool, message: string}')]
    public function destroy(RoleHasPermission $role_has_permission): JsonResponse
    {
        $role_has_permission->delete();
        Cache::tags(['role_has_permissions'])->flush();
        return response()->json([
            'success' => true,
            'message' => 'Rôle et permissions supprimés avec succès.',
        ]);
    }
}
