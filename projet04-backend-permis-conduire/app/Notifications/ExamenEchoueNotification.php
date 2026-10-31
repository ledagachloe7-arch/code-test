<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\Resultat;
use App\Services\AirtelSmsService;
use Illuminate\Support\Facades\Log;
use App\Channels\SmsChannel;

class ExamenEchoueNotification extends Notification implements ShouldQueue
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
        // Email + Database + Push
        return ['database', 'mail', 'push', SmsChannel::class];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $typeExamen = $this->resultat->type_examen === 'code' ? 'Code de la route' : 'Conduite';
        
        return (new MailMessage)
                    ->subject('❌ Résultat de votre examen - Échec')
                    ->greeting("Bonjour {$this->candidatName},")
                    ->line("Nous regrettons de vous informer que vous n'avez pas réussi votre examen de **{$typeExamen}**.")
                    ->line('**Détails du résultat :**')
                    ->line("📅 Date de l'examen : " . $this->resultat->date_examen->format('d/m/Y'))
                    ->line("📝 Type d'examen : {$typeExamen}")
                    ->line("📊 Note obtenue : {$this->resultat->note}/20")
                    ->line("**Ne vous découragez pas !**")
                    ->line('Chaque échec est une opportunité d\'apprendre et de s\'améliorer.')
                    ->line('**Prochaines étapes :**')
                    ->line('1. Analysez vos erreurs avec votre instructeur')
                    ->line('2. Renforcez vos connaissances')
                    ->line('3. Programmez une nouvelle session d\'examen')
                    ->action('Voir mon dossier', url('/dossiers'))
                    ->line('Votre auto-école reste à votre disposition pour vous accompagner.')
                    ->line('Courage et bonne continuation !');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'examen_echoue',
            'resultat_id' => $this->resultat->id,
            'dossier_id' => $this->resultat->dossier_id,
            'candidat_name' => $this->candidatName,
            'type_examen' => $this->resultat->type_examen,
            'note' => $this->resultat->note,
            'date_examen' => $this->resultat->date_examen->toISOString(),
            'message' => "Résultat de votre examen de {$this->resultat->type_examen} : Échec ({$this->resultat->note}/20)",
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
            $typeExamen = $this->resultat->type_examen === 'code' ? 'Code' : 'Conduite';
            $message = "DGTT: Résultat examen {$typeExamen} - Échec. Note: {$this->resultat->note}/20. Ne vous découragez pas.";
            $smsService->send($phoneNumber, $message);

            Log::info('[SMS] ExamenEchoue envoyé', ['phone' => $phoneNumber]);
        } catch (\Exception $e) {
            Log::error('[SMS] Erreur ExamenEchoue', ['error' => $e->getMessage()]);
        }
    }
}
