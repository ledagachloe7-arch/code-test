<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Services\AirtelSmsService;
use Illuminate\Support\Facades\Log;
use App\Channels\SmsChannel;

class DateExamenProgrammeeNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $examen;
    protected $candidatName;

    /**
     * Create a new notification instance.
     */
    public function __construct($examen, string $candidatName)
    {
        $this->examen = $examen;
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
        $typeExamen = $this->examen['type'] === 'code' ? 'Code de la route' : 'Conduite';
        $dateExamen = date('d/m/Y', strtotime($this->examen['date']));
        $heureExamen = date('H:i', strtotime($this->examen['date']));
        
        return (new MailMessage)
                    ->subject("📅 Votre examen est programmé !")
                    ->greeting("Bonjour {$this->candidatName},")
                    ->line('Bonne nouvelle ! Votre examen a été programmé.')
                    ->line('**Détails de l\'examen :**')
                    ->line("📝 Type d'examen : **{$typeExamen}**")
                    ->line("📅 Date : **{$dateExamen}**")
                    ->line("🕐 Heure : **{$heureExamen}**")
                    ->line("📍 Lieu : {$this->examen['lieu']}")
                    ->line('**Conseils pour réussir :**')
                    ->line('✅ Arrivez 15 minutes en avance')
                    ->line('✅ Apportez votre pièce d\'identité')
                    ->line('✅ Restez calme et concentré(e)')
                    ->line('✅ Relisez vos cours la veille')
                    ->line('**Important :**')
                    ->line('🚨 En cas d\'absence non justifiée, vous devrez reprogrammer l\'examen.')
                    ->action('Voir les détails', url('/dossiers'))
                    ->line('Nous vous souhaitons bonne chance ! 🍀')
                    ->line('Votre auto-école reste disponible pour toute préparation supplémentaire.');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'date_examen_programmee',
            'examen_id' => $this->examen['id'] ?? null,
            'candidat_name' => $this->candidatName,
            'type_examen' => $this->examen['type'],
            'date_examen' => $this->examen['date'],
            'heure_examen' => date('H:i', strtotime($this->examen['date'])),
            'lieu' => $this->examen['lieu'],
            'message' => "Votre examen de {$this->examen['type']} est programmé le " . date('d/m/Y à H:i', strtotime($this->examen['date'])),
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
            $date = date('d/m/Y à H:i', strtotime($this->examen['date']));
            $type = $this->examen['type'] === 'code' ? 'Code' : 'Conduite';
            $message = "DGTT: Convocation Examen {$type}. Le {$date}. Lieu: {$this->examen['lieu']}. Soyez à l'heure.";
            $smsService->send($phoneNumber, $message);

            Log::info('[SMS] DateExamenProgrammee envoyé', ['phone' => $phoneNumber]);
        } catch (\Exception $e) {
            Log::error('[SMS] Erreur DateExamenProgrammee', ['error' => $e->getMessage()]);
        }
    }
}
