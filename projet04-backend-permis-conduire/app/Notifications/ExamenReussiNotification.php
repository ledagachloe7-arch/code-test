<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use App\Models\Resultat;
use App\Services\AirtelSmsService;
use Illuminate\Support\Facades\Log;
use App\Channels\SmsChannel;

class ExamenReussiNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $resultat;
    protected $candidatName;

    /**
     * Create a new notification instance.
     */
    public function __construct(Resultat $resultat, string $candidatName)
    {
        $this->resultat = $resultat;
        $this->candidatName = $candidatName;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        // Database + Push + SMS uniquement (pas d'email)
        return ['database', 'push', SmsChannel::class];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'examen_reussi',
            'resultat_id' => $this->resultat->id,
            'dossier_id' => $this->resultat->dossier_id,
            'type_examen' => $this->resultat->typeExamen,
            'statut' => $this->resultat->statut,
            'candidat_name' => $this->candidatName,
            'date_examen' => $this->resultat->date->toISOString(),
            'commentaire' => $this->resultat->commentaire,
            'message' => 'Félicitations ! Vous avez réussi votre examen ' . ($this->resultat->typeExamen ?? ''),
        ];
    }

    /**
     * Notification par SMS
     */
    public function toSms(object $notifiable): void
    {
        try {
            $phoneNumber = $notifiable->telephone ?? $notifiable->personne?->contact ?? null;
            if (!$phoneNumber) return;

            $smsService = new AirtelSmsService();
            $typeExamen = $this->resultat->typeExamen ?? 'examen';
            $message = "🎉 Félicitations {$this->candidatName} ! Vous avez réussi votre {$typeExamen} ! - DGTT";
            $smsService->send($phoneNumber, $message);

            Log::info('[SMS] ExamenReussi envoyé', ['phone' => $phoneNumber]);
        } catch (\Exception $e) {
            Log::error('[SMS] Erreur ExamenReussi', ['error' => $e->getMessage()]);
        }
    }
}
