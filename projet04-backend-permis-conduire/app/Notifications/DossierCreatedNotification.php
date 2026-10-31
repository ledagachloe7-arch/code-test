<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use App\Models\Dossier;
use App\Services\AirtelSmsService;
use Illuminate\Support\Facades\Log;
use App\Channels\SmsChannel;

class DossierCreatedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $dossier;
    protected $candidatName;

    /**
     * Create a new notification instance.
     */
    public function __construct(Dossier $dossier, string $candidatName)
    {
        $this->dossier = $dossier;
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
            'type' => 'dossier_created',
            'dossier_id' => $this->dossier->id,
            'formation_name' => $this->dossier->formation->typePermis->libelle ?? 'Formation',
            'auto_ecole_name' => $this->dossier->autoEcole->nom_auto_ecole ?? 'Auto-école',
            'candidat_name' => $this->candidatName,
            'statut' => $this->dossier->statut,
            'created_date' => $this->dossier->created_at->toISOString(),
            'message' => 'Nouveau dossier créé par ' . $this->candidatName,
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
            $formation = $this->dossier->formation->typePermis->libelle ?? 'Formation';
            $message = "DGTT: Nouveau dossier créé pour {$formation} par {$this->candidatName}. Vérifiez votre espace.";
            $smsService->send($phoneNumber, $message);

            Log::info('[SMS] DossierCreated envoyé', ['phone' => $phoneNumber]);
        } catch (\Exception $e) {
            Log::error('[SMS] Erreur DossierCreated', ['error' => $e->getMessage()]);
        }
    }
}
