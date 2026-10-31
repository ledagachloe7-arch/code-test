<?php

namespace App\Http\Helpers;

use App\Models\Dossier;
use App\Models\Utilisateur;
use Illuminate\Http\JsonResponse;

/**
 * Helper pour la restriction par centre : un agent (non ROLE_CANDIDAT) avec centre_id
 * ne peut voir et traiter que les dossiers de son centre.
 * Les administrateurs (voir Utilisateur::bypassesDossierCentreScope) ne sont pas filtrés par centre.
 */
class CentreScopeHelper
{
    /**
     * Vérifie que l'agent connecté (avec centre_id) peut accéder au dossier.
     * Retourne une réponse 403 à renvoyer si l'accès est refusé, sinon null.
     */
    public static function ensureAgentCanAccessDossier(Dossier $dossier): ?JsonResponse
    {
        $user = auth()->user();
        if (!$user instanceof Utilisateur || $user->bypassesDossierCentreScope() || !$user->isAgentWithCentre()) {
            return null;
        }
        if ($dossier->centre_id !== $user->centre_id) {
            return response()->json([
                'success' => false,
                'message' => 'Vous n\'êtes pas autorisé à accéder à ce dossier (centre différent du vôtre).',
            ], 403);
        }
        return null;
    }

    /**
     * Applique le filtre centre sur le query builder pour les agents avec centre_id.
     * Les administrateurs (bypassesDossierCentreScope) voient tous les centres.
     */
    public static function applyCentreScopeToDossiersQuery($query): void
    {
        $user = auth()->user();
        if (!$user instanceof Utilisateur || $user->bypassesDossierCentreScope()) {
            return;
        }
        if ($user->isAgentWithCentre()) {
            $query->where('centre_id', $user->centre_id);
        }
    }
}
