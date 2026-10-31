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

class DocumentRejectedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $document;
    protected $candidatName;
    protected $reason;

    /**
     * Create a new notification instance.
     */
    public function __construct(Document $document, string $candidatName, string $reason = null)
    {
        $this->document = $document;
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
        // Email + Database + Push + SMS pour notifications complètes
        return ['database', 'mail', 'push', SmsChannel::class];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $mailMessage = (new MailMessage)
                    ->subject('Document rejeté - ' . $this->document->nom_fichier)
                    ->greeting('Bonjour ' . $this->candidatName . ',')
                    ->line('Votre document "' . $this->document->nom_fichier . '" a été rejeté.')
                    ->line('Type de document : ' . ($this->document->typeDocument->libelle ?? 'Non spécifié'))
                    ->line('Date de rejet : ' . now()->format('d/m/Y H:i'));

        if ($this->reason) {
            $mailMessage->line('Raison du rejet : ' . $this->reason);
        }

        if ($this->document->commentaires) {
            $mailMessage->line('Commentaires : ' . $this->document->commentaires);
        }

        $mailMessage->action('Télécharger un nouveau document', url('/candidat/documents/upload'))
                    ->line('Veuillez télécharger un nouveau document conforme aux exigences.');

        return $mailMessage;
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'document_rejected',
            'document_id' => $this->document->id,
            'document_name' => $this->document->nom_fichier,
            'candidat_name' => $this->candidatName,
            'rejection_date' => now()->toISOString(),
            'reason' => $this->reason,
            'message' => 'Votre document "' . $this->document->nom_fichier . '" a été rejeté',
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
            $message = "DGTT: Votre document '{$this->document->nom_fichier}' a été rejeté{$reason}. Veuillez le ré-uploader.";
            $smsService->send($phoneNumber, $message);

            Log::info('[SMS] DocumentRejected envoyé', ['phone' => $phoneNumber]);
        } catch (\Exception $e) {
            Log::error('[SMS] Erreur DocumentRejected', ['error' => $e->getMessage()]);
        }
    }
}
