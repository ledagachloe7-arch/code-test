<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Services\AirtelSmsService;
use Illuminate\Support\Facades\Log;
use App\Channels\SmsChannel;

class PaiementRecuNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $paiement;
    protected $candidatName;

    /**
     * Create a new notification instance.
     */
    public function __construct($paiement, string $candidatName)
    {
        $this->paiement = $paiement;
        $this->candidatName = $candidatName;
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
                    ->subject('✅ Confirmation de paiement')
                    ->greeting("Bonjour {$this->candidatName},")
                    ->line('Nous vous confirmons la bonne réception de votre paiement.')
                    ->line('**Détails du paiement :**')
                    ->line("💰 Montant : {$montant}")
                    ->line("📝 Motif : {$this->paiement['motif']}")
                    ->line("📅 Date : " . date('d/m/Y H:i'))
                    ->line("🔢 Référence : {$this->paiement['reference']}")
                    ->line('**Statut :** ✅ Confirmé')
                    ->line('Ce paiement a été enregistré dans votre dossier.')
                    ->action('Voir mon dossier', url('/dossiers'))
                    ->line('Merci pour votre confiance !')
                    ->line('Pour toute question, n\'hésitez pas à nous contacter.');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'paiement_recu',
            'paiement_id' => $this->paiement['id'] ?? null,
            'candidat_name' => $this->candidatName,
            'montant' => $this->paiement['montant'],
            'montant_formatted' => number_format($this->paiement['montant'], 0, ',', ' ') . ' FCFA',
            'motif' => $this->paiement['motif'],
            'reference' => $this->paiement['reference'],
            'date_paiement' => date('c'),
            'message' => "Paiement de " . number_format($this->paiement['montant'], 0, ',', ' ') . " FCFA confirmé",
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
            $message = "DGTT: Paiement reçu de {$montant} FCFA. Ref: {$this->paiement['reference']}. Merci.";
            $smsService->send($phoneNumber, $message);

            Log::info('[SMS] PaiementRecu envoyé', ['phone' => $phoneNumber]);
        } catch (\Exception $e) {
            Log::error('[SMS] Erreur PaiementRecu', ['error' => $e->getMessage()]);
        }
    }
}
