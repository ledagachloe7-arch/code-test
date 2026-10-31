<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Services\AirtelSmsService;
use Illuminate\Support\Facades\Log;
use App\Channels\SmsChannel;

class RappelPaiementNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $paiement;
    protected $candidatName;
    protected $joursRestants;

    /**
     * Create a new notification instance.
     */
    public function __construct($paiement, string $candidatName, int $joursRestants)
    {
        $this->paiement = $paiement;
        $this->candidatName = $candidatName;
        $this->joursRestants = $joursRestants;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        // Email + Database + Push
        return ['database', 'mail', 'push', SmsChannel::class];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $montant = number_format($this->paiement['montant'], 0, ',', ' ') . ' FCFA';
        $urgence = $this->joursRestants <= 3 ? '🔴 URGENT' : '⚠️';
        
        $message = (new MailMessage)
                    ->subject("{$urgence} Rappel de paiement")
                    ->greeting("Bonjour {$this->candidatName},");

        if ($this->joursRestants > 0) {
            $message->line("Nous vous rappelons qu'un paiement est attendu dans **{$this->joursRestants} jour(s)**.");
        } else {
            $message->line("⚠️ **ATTENTION** : La date limite de paiement est dépassée !");
        }

        $message->line('**Détails du paiement :**')
                ->line("💰 Montant : {$montant}")
                ->line("📝 Motif : {$this->paiement['motif']}")
                ->line("📅 Date limite : " . date('d/m/Y', strtotime($this->paiement['date_limite'])))
                ->line('**Pour effectuer votre paiement :**')
                ->line('1. Connectez-vous à votre espace')
                ->line('2. Accédez à votre dossier')
                ->line('3. Suivez les instructions de paiement')
                ->action('Payer maintenant', url('/dossiers'))
                ->line('En cas de difficulté, contactez votre auto-école.')
                ->line('Merci de régulariser votre situation rapidement.');

        return $message;
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'rappel_paiement',
            'paiement_id' => $this->paiement['id'] ?? null,
            'candidat_name' => $this->candidatName,
            'montant' => $this->paiement['montant'],
            'montant_formatted' => number_format($this->paiement['montant'], 0, ',', ' ') . ' FCFA',
            'motif' => $this->paiement['motif'],
            'date_limite' => $this->paiement['date_limite'],
            'jours_restants' => $this->joursRestants,
            'urgent' => $this->joursRestants <= 3,
            'message' => $this->joursRestants > 0 
                ? "Rappel : Paiement de {$this->paiement['montant']} FCFA attendu dans {$this->joursRestants} jour(s)"
                : "🔴 URGENT : Paiement de {$this->paiement['montant']} FCFA en retard",
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
            $montant = number_format($this->paiement['montant'], 0, ',', ' ');
            $urgence = $this->joursRestants <= 3 ? "URGENT:" : "Rappel:";
            
            if ($this->joursRestants > 0) {
                $message = "DGTT {$urgence} Paiement de {$montant} FCFA attendu dans {$this->joursRestants}j. Connectez-vous.";
            } else {
                $message = "DGTT RETARD: Paiement de {$montant} FCFA expiré. Veuillez régulariser immédiatement.";
            }

            $smsService->send($phoneNumber, $message);

            Log::info('[SMS] RappelPaiement envoyé', ['phone' => $phoneNumber]);
        } catch (\Exception $e) {
            Log::error('[SMS] Erreur RappelPaiement', ['error' => $e->getMessage()]);
        }
    }
}
