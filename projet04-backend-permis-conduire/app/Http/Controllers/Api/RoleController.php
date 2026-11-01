<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use Dedoc\Scramble\Attributes\Endpoint;
use Dedoc\Scramble\Attributes\Group;
use Dedoc\Scramble\Attributes\QueryParameter;
use Dedoc\Scramble\Attributes\Response as ScrambleResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

#[Group('Rôles', description: 'CRUD des rôles (code, libelle). Liste paginée, création, détail, mise à jour, suppression.')]
class RoleController extends Controller
{
    #[Endpoint(title: 'Liste des rôles', description: 'Liste paginée des rôles. Réponse paginator Laravel.')]
    #[QueryParameter('per_page', description: 'Nombre d\'éléments par page (1-100, défaut 15)', type: 'integer', required: false)]
    #[QueryParameter('page', description: 'Numéro de page', type: 'integer', required: false)]
    #[ScrambleResponse(200, 'Paginator Laravel : data, links, meta.')]
    public function index(Request $request)
    {
        $cacheKey = 'roles:' . md5(json_encode($request->all()));
        return Cache::tags(['roles'])->remember($cacheKey, 3600, function () use ($request) {
            return Role::query()->paginate($this->perPage($request));
        });
    }

    /** Crée un rôle. Body : code, libelle. */
    public function store(Request $request)
    {
        $role = Role::create($request->all());
        Cache::tags(['roles'])->flush();
        return $role;
    }
    /** Détail d'un rôle par ID. */
    public function show(Role $role)
    {
        return $role;
    }

    /** Met à jour un rôle. */
    public function update(Request $request, Role $role)
    {
        $role->update($request->all());
        Cache::tags(['roles'])->flush();
        return $role;
    }

    /** Supprime un rôle. Retourne message de confirmation. */
    public function destroy(Role $role)
    {
        $role->delete();
        Cache::tags(['roles'])->flush();
        return response()->json(['message' => 'Supprimé']);
    }
}
