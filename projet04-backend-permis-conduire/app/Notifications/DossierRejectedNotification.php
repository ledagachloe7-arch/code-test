<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use App\Models\Dossier;
use App\Services\AirtelSmsService;
use Illuminate\Support\Facades\Log;
use App\Channels\SmsChannel;

class DossierRejectedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $dossier;
    protected $candidatName;
    protected $reason;

    /**
     * Create a new notification instance.
     */
    public function __construct(Dossier $dossier, string $candidatName, string $reason = null)
    {
        $this->dossier = $dossier;
        $this->candidatName = $candidatName;
        $this->reason = $reason;
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
            'type' => 'dossier_rejected',
            'dossier_id' => $this->dossier->id,
            'formation_name' => $this->dossier->formation->typePermis->libelle ?? 'Formation',
            'auto_ecole_name' => $this->dossier->autoEcole->nom_auto_ecole ?? 'Auto-école',
            'candidat_name' => $this->candidatName,
            'rejection_date' => now()->toISOString(),
            'reason' => $this->reason,
            'message' => 'Votre dossier de candidature a été rejeté',
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
            $reason = $this->reason ? ": {$this->reason}" : '';
            $message = "DGTT: Désolé {$this->candidatName}, votre dossier a été rejeté{$reason}. Contactez votre auto-école.";
            $smsService->send($phoneNumber, $message);

            Log::info('[SMS] DossierRejected envoyé', ['phone' => $phoneNumber]);
        } catch (\Exception $e) {
            Log::error('[SMS] Erreur DossierRejected', ['error' => $e->getMessage()]);
        }
    }
}
