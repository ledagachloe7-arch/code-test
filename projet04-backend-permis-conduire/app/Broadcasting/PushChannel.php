<?php

namespace App\Broadcasting;

use App\Models\Utilisateur;
use Illuminate\Notifications\Notification;

class PushChannel
{
    /**
     * Envoyer la notification push
     */
    public function send($notifiable, Notification $notification): void
    {
        if (!($notifiable instanceof Utilisateur)) {
            return;
        }

        // Récupérer les données de la notification
        $data = $notification->toArray($notifiable);
        
        // Déterminer le titre et le corps du message
        $title = $this->getTitle($data);
        $body = $this->getBody($data, $notification);
        
        // Préparer les données supplémentaires
        $pushData = [
            'type' => $data['type'] ?? 'notification',
            'url' => $this->getUrl($data, $notification),
            'icon' => config('app.url') . '/favicon.ico',
            'badge' => config('app.url') . '/favicon.ico',
        ];

        // Fusionner avec les données existantes
        $pushData = array_merge($pushData, $data);

        // Envoyer via le service
        $pushService = app(\App\Services\PushNotificationService::class);
        $pushService->sendToUser($notifiable, $title, $body, $pushData);
    }

    /**
     * Obtenir le titre de la notification
     */
    protected function getTitle(array $data): string
    {
        $type = $data['type'] ?? 'notification';
        
        return match($type) {
            'document_validated' => '✅ Document validé',
            'document_rejected' => '❌ Document rejeté',
            'document_uploaded' => '📄 Nouveau document',
            'dossier_validated' => '✅ Dossier validé',
            'dossier_rejected' => '❌ Dossier rejeté',
            'dossier_created' => '📋 Nouveau dossier',
            'examen_reussi' => '🎓 Examen réussi',
            'account_created' => '🎉 Compte créé',
            default => '🔔 Nouvelle notification',
        };
    }

    /**
     * Obtenir le corps du message
     */
    protected function getBody(array $data, Notification $notification): string
    {
        if (isset($data['message'])) {
            return $data['message'];
        }

        $type = $data['type'] ?? 'notification';
        
        return match($type) {
            'document_validated' => 'Votre document "' . ($data['document_name'] ?? 'document') . '" a été validé',
            'document_rejected' => 'Votre document "' . ($data['document_name'] ?? 'document') . '" a été rejeté',
            'document_uploaded' => 'Nouveau document uploadé par ' . ($data['candidat_name'] ?? 'un candidat'),
            'dossier_validated' => 'Votre dossier de candidature a été validé avec succès !',
            'dossier_rejected' => 'Votre dossier de candidature a été rejeté',
            'dossier_created' => 'Nouveau dossier créé par ' . ($data['candidat_name'] ?? 'un candidat'),
            'examen_reussi' => $data['message'] ?? 'Félicitations ! Vous avez réussi votre examen',
            'account_created' => 'Votre compte a été créé avec succès !',
            default => 'Vous avez une nouvelle notification',
        };
    }

    /**
     * Obtenir l'URL de redirection
     */
    protected function getUrl(array $data, Notification $notification): string
    {
        $baseUrl = config('app.url');
        $type = $data['type'] ?? 'notification';

        return match($type) {
            'document_validated', 'document_rejected' => $baseUrl . '/candidat/dossiers',
            'document_uploaded' => $baseUrl . '/admin/documents/' . ($data['document_id'] ?? ''),
            'dossier_validated', 'dossier_rejected' => $baseUrl . '/candidat/dossiers/' . ($data['dossier_id'] ?? ''),
            'dossier_created' => $baseUrl . '/admin/dossiers/' . ($data['dossier_id'] ?? ''),
            'examen_reussi' => $baseUrl . '/candidat/dossiers/' . ($data['dossier_id'] ?? ''),
            'account_created' => $baseUrl . '/dashboard',
            default => $baseUrl . '/notifications',
        };
    }
}
