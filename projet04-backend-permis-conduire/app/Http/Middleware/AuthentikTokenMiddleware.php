<?php

namespace App\Http\Middleware;

use App\Models\Utilisateur;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class AuthentikTokenMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Récupérer le jeton Bearer envoyé par le client.
        $plainTextToken = $request->bearerToken();

        if (!$plainTextToken) {
            return response()->json([
                'success' => false,
                'message' => "Token d'authentification manquant. Veuillez vous connecter.",
            ], 401);
        }

        // 2. Vérifier le jeton Sanctum en base de données.
        $accessToken = PersonalAccessToken::findToken($plainTextToken);

        if (!$accessToken) {
            return response()->json([
                'success' => false,
                'message' => 'Token invalide ou révoqué. Veuillez vous reconnecter.',
            ], 401);
        }

        // 3. Vérifier que le jeton appartient à un utilisateur de l'application.
        $user = $accessToken->tokenable;

        if (!$user instanceof Utilisateur) {
            return response()->json([
                'success' => false,
                'message' => 'Utilisateur non trouvé ou non autorisé.',
            ], 401);
        }

        // 4. Vérifier l'expiration individuelle du jeton.
        if (
            $accessToken->expires_at !== null &&
            $accessToken->expires_at->isPast()
        ) {
            $accessToken->delete();

            return response()->json([
                'success' => false,
                'message' => 'Token expiré. Veuillez vous reconnecter.',
            ], 401);
        }

        // 5. Vérifier également la durée globale de Sanctum, si configurée.
        $expirationMinutes = config('sanctum.expiration');

        if (
            $expirationMinutes !== null &&
            $expirationMinutes > 0 &&
            $accessToken->created_at !== null &&
            $accessToken->created_at->lte(
                now()->subMinutes((int) $expirationMinutes)
            )
        ) {
            $accessToken->delete();

            return response()->json([
                'success' => false,
                'message' => 'Token expiré. Veuillez vous reconnecter.',
            ], 401);
        }

        // 6. Refuser les refresh tokens sur les routes protégées.
        // Seuls les jetons possédant la capacité "access" sont autorisés.
        if (!$accessToken->can('access')) {
            return response()->json([
                'success' => false,
                'message' => "Ce jeton n'est pas autorisé à accéder à cette ressource.",
            ], 401);
        }

        // 7. Associer le jeton à l'utilisateur authentifié.
        $user->withAccessToken($accessToken);

        // Charger les informations de la personne si nécessaire.
        $user->loadMissing('personne');

        // 8. Conserver la compatibilité avec les contrôleurs existants.
        $request->attributes->set('authenticated_user', $user);

        $request->attributes->set('token_payload', [
            'user_id' => $user->id,
            'email' => $user->email,
            'role' => $user->role,
        ]);

        // 9. Rendre l'utilisateur disponible via Auth::user().
        Auth::setUser($user);

        // 10. Continuer vers la route demandée.
        return $next($request);
    }
}
