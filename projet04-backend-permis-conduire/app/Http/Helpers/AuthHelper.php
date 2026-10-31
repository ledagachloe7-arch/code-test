<?php

namespace App\Http\Helpers;

use App\Models\Utilisateur;
use Illuminate\Http\Request;

class AuthHelper
{
    /**
     * Récupérer l'utilisateur authentifié depuis le token
     *
     * @param Request $request
     * @return Utilisateur|null
     */
    public static function getAuthenticatedUser(Request $request): ?Utilisateur
    {
        return $request->attributes->get('authenticated_user');
    }

    /**
     * Récupérer le payload du token
     *
     * @param Request $request
     * @return array|null
     */
    public static function getTokenPayload(Request $request): ?array
    {
        return $request->attributes->get('token_payload');
    }

    /**
     * Vérifier si l'utilisateur a un rôle spécifique
     *
     * @param Request $request
     * @param string|array $roles
     * @return bool
     */
    public static function hasRole(Request $request, string|array $roles): bool
    {
        $user = self::getAuthenticatedUser($request);
        
        if (!$user) {
            return false;
        }

        $roles = is_array($roles) ? $roles : [$roles];
        
        return in_array($user->role, $roles);
    }

    /**
     * Vérifier si l'utilisateur est un candidat
     *
     * @param Request $request
     * @return bool
     */
    public static function isCandidat(Request $request): bool
    {
        return self::hasRole($request, 'candidat');
    }

    /**
     * Vérifier si l'utilisateur est un responsable d'auto-école
     *
     * @param Request $request
     * @return bool
     */
    public static function isResponsable(Request $request): bool
    {
        return self::hasRole($request, 'responsable_auto_ecole');
    }

    /**
     * Vérifier si l'utilisateur est un administrateur
     *
     * @param Request $request
     * @return bool
     */
    public static function isAdmin(Request $request): bool
    {
        return self::hasRole($request, 'admin');
    }
}


