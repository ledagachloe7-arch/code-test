<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Services\AirtelSmsService;
use Illuminate\Support\Facades\Log;
use App\Channels\SmsChannel;

class PermisDisponibleNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $permis;
    protected $candidatName;

    /**
     * Create a new notification instance.
     */
    public function __construct($permis, string $candidatName)
    {
        $this->permis = $permis;
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
        $typePermis = $this->permis['type'] ?? 'permis de conduire';
        
        return (new MailMessage)
                    ->subject("🎉 Félicitations ! Votre permis est disponible")
                    ->greeting("Bonjour {$this->candidatName},")
                    ->line('🎊 **Excellente nouvelle !** Votre **' . $typePermis . '** est maintenant disponible pour retrait.')
                    ->line('**Informations de retrait :**')
                    ->line("📍 Lieu : {$this->permis['lieu_retrait']}")
                    ->line("🕐 Horaires : {$this->permis['horaires']}")
                    ->line("📅 Disponible à partir du : " . date('d/m/Y', strtotime($this->permis['date_disponibilite'])))
                    ->line('**Documents à apporter :**')
                    ->line('✅ Pièce d\'identité originale')
                    ->line('✅ Reçu de paiement des frais de formation')
                    ->line('✅ Une photo d\'identité récente (si non fournie)')
                    ->line('**Démarches de retrait :**')
                    ->line('1. Présentez-vous au lieu de retrait aux horaires indiqués')
                    ->line('2. Munissez-vous des documents requis')
                    ->line('3. Signez le registre de retrait')
                    ->line('4. Récupérez votre permis')
                    ->line('⚠️ **Important :** Le permis doit être retiré dans un délai de 30 jours.')
                    ->action('Voir les détails', url('/dossiers'))
                    ->line('Félicitations pour votre réussite ! 🚗')
                    ->line('Bonne route et conduite prudente !');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'permis_disponible',
            'permis_id' => $this->permis['id'] ?? null,
            'candidat_name' => $this->candidatName,
            'type_permis' => $this->permis['type'] ?? 'permis de conduire',
            'lieu_retrait' => $this->permis['lieu_retrait'],
            'horaires' => $this->permis['horaires'],
            'date_disponibilite' => $this->permis['date_disponibilite'],
            'message' => "🎉 Votre {$this->permis['type']} est disponible pour retrait !",
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
            $type = $this->permis['type'] ?? 'permis';
            $message = "DGTT: Bonne nouvelle ! Votre {$type} est disponible au retrait à {$this->permis['lieu_retrait']}.";
            $smsService->send($phoneNumber, $message);

            Log::info('[SMS] PermisDisponible envoyé', ['phone' => $phoneNumber]);
        } catch (\Exception $e) {
            Log::error('[SMS] Erreur PermisDisponible', ['error' => $e->getMessage()]);
        }
    }
}
