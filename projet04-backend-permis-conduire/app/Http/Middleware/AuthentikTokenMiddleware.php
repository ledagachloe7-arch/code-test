<?php

namespace App\Http\Middleware;

use App\Models\Utilisateur;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
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

        // 2. Vérifier le jeton Sanctum.
        // Cache::remember() est compatible avec CACHE_STORE=file.
        $tokenHash = hash('sha256', $plainTextToken);
        $cacheKey = "auth:token:{$tokenHash}";

        $cachedAuth = Cache::remember($cacheKey, 600, function () use ($plainTextToken) {
            $accessToken = PersonalAccessToken::findToken($plainTextToken);

            if (!$accessToken) {
                return null;
            }

            $user = $accessToken->tokenable;

            if (!$user instanceof Utilisateur) {
                return null;
            }

            $user->loadMissing('personne');

            return [
                'accessToken' => $accessToken,
                'user' => $user,
            ];
        });

        if (!$cachedAuth) {
            return response()->json([
                'success' => false,
                'message' => 'Token invalide ou révoqué. Veuillez vous reconnecter.',
            ], 401);
        }

        $accessToken = $cachedAuth['accessToken'];
        $user = $cachedAuth['user'];

        // 3. Vérifier l'expiration individuelle du jeton.
        if (
            $accessToken->expires_at !== null &&
            $accessToken->expires_at->isPast()
        ) {
            Cache::forget($cacheKey);
            $accessToken->delete();

            return response()->json([
                'success' => false,
                'message' => 'Token expiré. Veuillez vous reconnecter.',
            ], 401);
        }

        // 4. Vérifier également la durée globale de Sanctum.
        $expirationMinutes = config('sanctum.expiration');

        if (
            $expirationMinutes !== null &&
            $expirationMinutes > 0 &&
            $accessToken->created_at !== null &&
            $accessToken->created_at->lte(
                now()->subMinutes((int) $expirationMinutes)
            )
        ) {
            Cache::forget($cacheKey);
            $accessToken->delete();

            return response()->json([
                'success' => false,
                'message' => 'Token expiré. Veuillez vous reconnecter.',
            ], 401);
        }

        // 5. Refuser les refresh tokens sur les routes protégées.
        // Seuls les jetons possédant la capacité "access" sont autorisés.
        if (!$accessToken->can('access')) {
            return response()->json([
                'success' => false,
                'message' => "Ce jeton n'est pas autorisé à accéder à cette ressource.",
            ], 401);
        }

        // 6. Associer le jeton à l'utilisateur authentifié.
        $user->withAccessToken($accessToken);

        // Charger les informations de la personne si nécessaire.
        $user->loadMissing('personne');

        // 7. Conserver la compatibilité avec les contrôleurs existants.
        $request->attributes->set('authenticated_user', $user);

        $request->attributes->set('token_payload', [
            'user_id' => $user->id,
            'email' => $user->email,
            'role' => $user->role,
        ]);

        // 8. Rendre l'utilisateur disponible via Auth::user().
        Auth::setUser($user);

        // 9. Continuer vers la route demandée.
        return $next($request);
    }
}
