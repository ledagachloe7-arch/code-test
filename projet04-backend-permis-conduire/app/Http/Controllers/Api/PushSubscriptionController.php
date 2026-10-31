<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PushNotificationService;
use Dedoc\Scramble\Attributes\Endpoint;
use Dedoc\Scramble\Attributes\Group;
use Dedoc\Scramble\Attributes\QueryParameter;
use Dedoc\Scramble\Attributes\Response as ScrambleResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

#[Group('Push', description: 'Souscription et envoi de notifications push (web). Enregistrement endpoint, envoi de notifications.')]
class PushSubscriptionController extends Controller
{
    protected $pushService;

    public function __construct(PushNotificationService $pushService)
    {
        $this->pushService = $pushService;
    }

    /**
     * Enregistre une souscription push (endpoint, clés) pour l'utilisateur connecté.
     * 
     * @OA\Post(
     *     path="/api/push/subscribe",
     *     operationId="subscribePush",
     *     tags={"🔔 Notifications Push"},
     *     summary="Enregistrer une souscription push",
     *     description="Enregistre une souscription push pour l'utilisateur authentifié afin de recevoir des notifications en temps réel",
     *     security={{"BearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"endpoint", "keys"},
     *             @OA\Property(property="endpoint", type="string", format="url", example="https://fcm.googleapis.com/fcm/send/...", description="URL unique du service push"),
     *             @OA\Property(property="keys", type="object", required={"p256dh", "auth"},
     *                 @OA\Property(property="p256dh", type="string", example="BFx...", description="Clé publique P256DH"),
     *                 @OA\Property(property="auth", type="string", example="...", description="Token d'authentification")
     *             ),
     *             @OA\Property(property="contentEncoding", type="string", enum={"aesgcm", "aes128gcm"}, example="aesgcm", description="Encodage du contenu")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="✅ Souscription enregistrée avec succès",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Souscription push enregistrée avec succès"),
     *             @OA\Property(property="subscription", type="object",
     *                 @OA\Property(property="id", type="string", format="uuid", example="019a0e34-d153-7330-8cb6-80b14fd8811c"),
     *                 @OA\Property(property="endpoint", type="string", example="https://fcm.googleapis.com/fcm/send/...")
     *             )
     *         )
     *     ),
     *     @OA\Response(response=401, description="❌ Utilisateur non authentifié"),
     *     @OA\Response(response=422, description="❌ Erreur de validation")
     * )
     */
    public function subscribe(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'endpoint' => 'required|url',
            'keys' => 'required|array',
            'keys.p256dh' => 'required|string',
            'keys.auth' => 'required|string',
            'contentEncoding' => 'nullable|string|in:aesgcm,aes128gcm',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données de souscription invalides',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Utilisateur non authentifié',
            ], 401);
        }

        try {
            $subscription = $this->pushService->subscribe($user, $request->all());

            return response()->json([
                'success' => true,
                'message' => 'Souscription push enregistrée avec succès',
                'subscription' => [
                    'id' => $subscription->id,
                    'endpoint' => $subscription->endpoint,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'enregistrement de la souscription',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Désinscrire des notifications push
     * 
     * @OA\Post(
     *     path="/api/push/unsubscribe",
     *     operationId="unsubscribePush",
     *     tags={"🔔 Notifications Push"},
     *     summary="Désinscrire des notifications push",
     *     description="Désinscrit l'utilisateur authentifié des notifications push. Si endpoint est fourni, supprime uniquement cette souscription, sinon supprime toutes les souscriptions",
     *     security={{"BearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=false,
     *         @OA\JsonContent(
     *             @OA\Property(property="endpoint", type="string", format="url", example="https://fcm.googleapis.com/fcm/send/...", description="Endpoint spécifique à désinscrire (optionnel)")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="✅ Souscription supprimée avec succès",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Souscription supprimée avec succès"),
     *             @OA\Property(property="deleted", type="boolean", example=true)
     *         )
     *     ),
     *     @OA\Response(response=401, description="❌ Utilisateur non authentifié")
     * )
     */
    public function unsubscribe(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Utilisateur non authentifié',
            ], 401);
        }

        $endpoint = $request->input('endpoint');

        try {
            $deleted = $this->pushService->unsubscribe($user, $endpoint);

            return response()->json([
                'success' => true,
                'message' => $endpoint 
                    ? 'Souscription supprimée avec succès'
                    : 'Toutes les souscriptions ont été supprimées',
                'deleted' => $deleted,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la désinscription',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Vérifier si l'utilisateur a des souscriptions actives
     * 
     * @OA\Get(
     *     path="/api/push/status",
     *     operationId="getPushStatus",
     *     tags={"🔔 Notifications Push"},
     *     summary="Vérifier le statut des souscriptions push",
     *     description="Retourne le statut des souscriptions push de l'utilisateur authentifié",
     *     security={{"BearerAuth":{}}},
     *     @OA\Response(
     *         response=200,
     *         description="✅ Statut des souscriptions",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="subscribed", type="boolean", example=true, description="Indique si l'utilisateur a au moins une souscription active"),
     *             @OA\Property(property="count", type="integer", example=2, description="Nombre de souscriptions actives"),
     *             @OA\Property(property="subscriptions", type="array", @OA\Items(type="object",
     *                 @OA\Property(property="id", type="string", format="uuid"),
     *                 @OA\Property(property="endpoint", type="string", example="https://fcm.googleapis.com/fcm/send/..."),
     *                 @OA\Property(property="created_at", type="string", format="date-time", example="2025-11-26T12:00:00Z")
     *             ))
     *         )
     *     ),
     *     @OA\Response(response=401, description="❌ Utilisateur non authentifié")
     * )
     */
    #[Endpoint(title: 'Statut des souscriptions push', description: 'subscribed et count sur toutes les souscriptions ; la liste subscriptions est paginée (per_page, page).')]
    #[QueryParameter('per_page', description: 'Nombre d\'éléments par page pour la liste subscriptions (1-100, défaut 15)', type: 'integer', required: false)]
    #[QueryParameter('page', description: 'Numéro de page', type: 'integer', required: false)]
    #[ScrambleResponse(200, 'success, subscribed, count (total), subscriptions (page), pagination.')]
    #[ScrambleResponse(401, 'Non authentifié.')]
    public function status(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Utilisateur non authentifié',
            ], 401);
        }

        $total = \App\Models\PushSubscription::where('utilisateur_id', $user->id)->count();
        $paginator = \App\Models\PushSubscription::where('utilisateur_id', $user->id)
            ->latest()
            ->paginate($this->perPage($request));

        return response()->json([
            'success' => true,
            'subscribed' => $total > 0,
            'count' => $total,
            'subscriptions' => collect($paginator->items())->map(function ($sub) {
                return [
                    'id' => $sub->id,
                    'endpoint' => substr($sub->endpoint, 0, 50) . '...',
                    'created_at' => $sub->created_at->toISOString(),
                ];
            })->values()->all(),
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    /**
     * Obtenir la clé publique VAPID
     * 
     * @OA\Get(
     *     path="/api/push/vapid-public-key",
     *     operationId="getVapidPublicKey",
     *     tags={"🔔 Notifications Push"},
     *     summary="Obtenir la clé publique VAPID",
     *     description="Retourne la clé publique VAPID nécessaire pour souscrire aux notifications push (route publique)",
     *     @OA\Response(
     *         response=200,
     *         description="✅ Clé publique VAPID",
     *         @OA\JsonContent(
     *             @OA\Property(property="public_key", type="string", example="BFx...", description="Clé publique VAPID en base64")
     *         )
     *     )
     * )
     */
    public function getVapidPublicKey(): JsonResponse
    {
        return response()->json([
            'public_key' => config('services.webpush.public_key'),
        ]);
    }
}
