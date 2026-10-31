<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\Document;
use App\Services\AirtelSmsService;
use Illuminate\Support\Facades\Log;
use App\Channels\SmsChannel;

class DocumentValidatedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $document;
    protected $candidatName;

    /**
     * Create a new notification instance.
     */
    public function __construct(Document $document, string $candidatName)
    {
        $this->document = $document;
        $this->candidatName = $candidatName;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        // Email + Database + Push + SMS pour notifications complètes
        return ['database', 'mail', 'push', SmsChannel::class];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
                    ->subject('Document validé - ' . $this->document->nom_fichier)
                    ->greeting('Bonjour ' . $this->candidatName . ',')
                    ->line('Votre document "' . $this->document->nom_fichier . '" a été validé avec succès.')
                    ->line('Type de document : ' . ($this->document->typeDocument->libelle ?? 'Non spécifié'))
                    ->line('Date de validation : ' . now()->format('d/m/Y H:i'))
                    ->line('Vous pouvez continuer votre processus d\'inscription.')
                    ->action('Voir mes dossiers', url('/candidat/dossiers'))
                    ->line('Merci de votre confiance !');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'document_validated',
            'document_id' => $this->document->id,
            'document_name' => $this->document->nom_fichier,
            'candidat_name' => $this->candidatName,
            'validation_date' => now()->toISOString(),
            'message' => 'Votre document "' . $this->document->nom_fichier . '" a été validé',
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
            $message = "Félicitations {$this->candidatName} ! Votre document '{$this->document->nom_fichier}' a été validé. - DGTT";
            $smsService->send($phoneNumber, $message);

            Log::info('[SMS] DocumentValidated envoyé', ['phone' => $phoneNumber]);
        } catch (\Exception $e) {
            Log::error('[SMS] Erreur DocumentValidated', ['error' => $e->getMessage()]);
        }
    }
}
