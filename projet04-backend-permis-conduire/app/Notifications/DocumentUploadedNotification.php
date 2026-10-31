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

class DocumentUploadedNotification extends Notification implements ShouldQueue
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
        return ['database', 'push', SmsChannel::class];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
                    ->subject('Nouveau document uploadé - ' . $this->document->nom_fichier)
                    ->greeting('Bonjour,')
                    ->line('Un nouveau document a été uploadé par le candidat : ' . $this->candidatName)
                    ->line('Nom du fichier : ' . $this->document->nom_fichier)
                    ->line('Type de document : ' . ($this->document->typeDocument->libelle ?? 'Non spécifié'))
                    ->line('Date d\'upload : ' . $this->document->created_at->format('d/m/Y H:i'))
                    ->action('Voir le document', url('/admin/documents/' . $this->document->id))
                    ->line('Merci d\'utiliser notre plateforme !');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'document_uploaded',
            'document_id' => $this->document->id,
            'document_name' => $this->document->nom_fichier,
            'candidat_name' => $this->candidatName,
            'upload_date' => $this->document->created_at->toISOString(),
            'message' => 'Nouveau document uploadé par ' . $this->candidatName,
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
            $message = "DGTT: Nouveau document '{$this->document->nom_fichier}' uploadé par {$this->candidatName}. Verifiez-le.";
            $smsService->send($phoneNumber, $message);

            Log::info('[SMS] DocumentUploaded envoyé', ['phone' => $phoneNumber]);
        } catch (\Exception $e) {
            Log::error('[SMS] Erreur DocumentUploaded', ['error' => $e->getMessage()]);
        }
    }
}
