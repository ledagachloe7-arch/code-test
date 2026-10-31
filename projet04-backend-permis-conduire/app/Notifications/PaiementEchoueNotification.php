<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Services\AirtelSmsService;
use Illuminate\Support\Facades\Log;
use App\Channels\SmsChannel;

class PaiementEchoueNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $paiement;
    protected $candidatName;
    protected $reason;

    /**
     * Create a new notification instance.
     */
    public function __construct($paiement, string $candidatName, string $reason = null)
    {
        $this->paiement = $paiement;
        $this->candidatName = $candidatName;
        $this->reason = $reason ?? 'Échec de la transaction';
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
        
        return (new MailMessage)
                    ->subject('❌ Échec de paiement')
                    ->greeting("Bonjour {$this->candidatName},")
                    ->line('Nous regrettons de vous informer que votre paiement n\'a pas pu être traité.')
                    ->line('**Détails de la tentative :**')
                    ->line("💰 Montant : {$montant}")
                    ->line("📝 Motif : {$this->paiement['motif']}")
                    ->line("🔢 Référence : {$this->paiement['reference']}")
                    ->line("**Raison de l'échec :** {$this->reason}")
                    ->line('**Que faire maintenant ?**')
                    ->line('1. Vérifiez que votre compte dispose de fonds suffisants')
                    ->line('2. Vérifiez les informations de paiement')
                    ->line('3. Réessayez le paiement')
                    ->line('4. Contactez votre banque ou opérateur mobile si le problème persiste')
                    ->action('Réessayer le paiement', url('/dossiers'))
                    ->line('Notre équipe reste à votre disposition pour toute assistance.');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'paiement_echoue',
            'paiement_id' => $this->paiement['id'] ?? null,
            'candidat_name' => $this->candidatName,
            'montant' => $this->paiement['montant'],
            'montant_formatted' => number_format($this->paiement['montant'], 0, ',', ' ') . ' FCFA',
            'motif' => $this->paiement['motif'],
            'reference' => $this->paiement['reference'],
            'reason' => $this->reason,
            'date_tentative' => date('c'),
            'message' => "Échec du paiement de " . number_format($this->paiement['montant'], 0, ',', ' ') . " FCFA",
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
            $reason = substr($this->reason, 0, 30); // Limiter la longueur
            $message = "DGTT: Échec paiement de {$montant} FCFA. Motif: {$reason}. Vérifiez votre solde.";
            $smsService->send($phoneNumber, $message);

            Log::info('[SMS] PaiementEchoue envoyé', ['phone' => $phoneNumber]);
        } catch (\Exception $e) {
            Log::error('[SMS] Erreur PaiementEchoue', ['error' => $e->getMessage()]);
        }
    }
}
