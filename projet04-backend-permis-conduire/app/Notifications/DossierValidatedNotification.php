<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use App\Models\Dossier;
use App\Services\AirtelSmsService;
use Illuminate\Support\Facades\Log;
use App\Channels\SmsChannel;

class DossierValidatedNotification extends Notification implements ShouldQueue
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
            'type' => 'dossier_validated',
            'dossier_id' => $this->dossier->id,
            'formation_name' => $this->dossier->formation->typePermis->libelle ?? 'Formation',
            'auto_ecole_name' => $this->dossier->autoEcole->nom_auto_ecole ?? 'Auto-école',
            'candidat_name' => $this->candidatName,
            'validation_date' => now()->toISOString(),
            'message' => 'Votre dossier de candidature a été validé avec succès !',
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
            $message = "Félicitations {$this->candidatName} ! Votre dossier de permis a été validé. Prochaine étape: examen. - DGTT";
            $smsService->send($phoneNumber, $message);

            Log::info('[SMS] DossierValidated envoyé', ['phone' => $phoneNumber]);
        } catch (\Exception $e) {
            Log::error('[SMS] Erreur DossierValidated', ['error' => $e->getMessage()]);
        }
    }
}
