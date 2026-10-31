<?php

namespace App\Services;

use App\Models\PushSubscription;
use App\Models\Utilisateur;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

class PushNotificationService
{
    protected $webPush;

    public function __construct()
    {
        $publicKey = config('services.webpush.public_key');
        $privateKey = config('services.webpush.private_key');

        if (!$publicKey || !$privateKey) {
            Log::warning('Clés VAPID non configurées pour les notifications push');
            return;
        }

        $this->webPush = new WebPush([
            'VAPID' => [
                'subject' => config('app.url'),
                'publicKey' => $publicKey,
                'privateKey' => $privateKey,
            ],
        ]);
    }

    /**
     * Enregistrer une souscription push pour un utilisateur
     */
    public function subscribe(Utilisateur $user, array $subscriptionData): PushSubscription
    {
        return PushSubscription::updateOrCreate(
            [
                'utilisateur_id' => $user->id,
                'endpoint' => $subscriptionData['endpoint'],
            ],
            [
                'public_key' => $subscriptionData['keys']['p256dh'] ?? null,
                'auth_token' => $subscriptionData['keys']['auth'] ?? null,
                'content_encoding' => $subscriptionData['contentEncoding'] ?? 'aesgcm',
                'user_agent' => request()->userAgent(),
            ]
        );
    }

    /**
     * Désinscrire un utilisateur (supprimer toutes ses souscriptions)
     */
    public function unsubscribe(Utilisateur $user, ?string $endpoint = null): bool
    {
        $query = PushSubscription::where('utilisateur_id', $user->id);

        if ($endpoint) {
            $query->where('endpoint', $endpoint);
        }

        return $query->delete() > 0;
    }

    /**
     * Envoyer une notification push à un utilisateur
     */
    public function sendToUser(Utilisateur $user, string $title, string $body, array $data = []): int
    {
        if (!$this->webPush) {
            Log::warning('WebPush non initialisé, impossible d\'envoyer la notification');
            return 0;
        }

        $subscriptions = PushSubscription::where('utilisateur_id', $user->id)->get();
        
        if ($subscriptions->isEmpty()) {
            return 0;
        }

        $payload = json_encode([
            'title' => $title,
            'body' => $body,
            'icon' => $data['icon'] ?? '/favicon.ico',
            'badge' => $data['badge'] ?? '/favicon.ico',
            'data' => $data,
            'url' => $data['url'] ?? config('app.url'),
        ]);

        $sent = 0;
        $errors = [];

        foreach ($subscriptions as $subscription) {
            try {
                $pushSubscription = Subscription::create([
                    'endpoint' => $subscription->endpoint,
                    'keys' => [
                        'p256dh' => $subscription->public_key,
                        'auth' => $subscription->auth_token,
                    ],
                    'contentEncoding' => $subscription->content_encoding ?? 'aesgcm',
                ]);

                $this->webPush->queueNotification($pushSubscription, $payload);
                $sent++;
            } catch (\Exception $e) {
                Log::error('Erreur lors de l\'envoi de notification push', [
                    'subscription_id' => $subscription->id,
                    'error' => $e->getMessage(),
                ]);

                // Si l'endpoint est invalide, supprimer la souscription
                if (str_contains($e->getMessage(), '410') || str_contains($e->getMessage(), '404')) {
                    $subscription->delete();
                }

                $errors[] = $e->getMessage();
            }
        }

        // Envoyer toutes les notifications en file d'attente
        foreach ($this->webPush->flush() as $report) {
            if (!$report->isSuccess()) {
                Log::error('Échec envoi notification push', [
                    'endpoint' => $report->getEndpoint(),
                    'reason' => $report->getReason(),
                ]);

                // Supprimer les souscriptions invalides
                if (in_array($report->getResponse()->getStatusCode(), [410, 404])) {
                    PushSubscription::where('endpoint', $report->getEndpoint())->delete();
                }
            }
        }

        return $sent;
    }

    /**
     * Envoyer une notification push à plusieurs utilisateurs
     */
    public function sendToUsers(array $users, string $title, string $body, array $data = []): int
    {
        $totalSent = 0;
        foreach ($users as $user) {
            if ($user instanceof Utilisateur) {
                $totalSent += $this->sendToUser($user, $title, $body, $data);
            }
        }
        return $totalSent;
    }
}

