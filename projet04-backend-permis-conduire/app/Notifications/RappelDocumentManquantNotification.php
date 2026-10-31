<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Services\AirtelSmsService;
use Illuminate\Support\Facades\Log;
use App\Channels\SmsChannel;

class RappelDocumentManquantNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $dossier;
    protected $candidatName;
    protected $documentsManquants;

    /**
     * Create a new notification instance.
     */
    public function __construct($dossier, string $candidatName, array $documentsManquants)
    {
        $this->dossier = $dossier;
        $this->candidatName = $candidatName;
        $this->documentsManquants = $documentsManquants;
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
        $nbDocuments = count($this->documentsManquants);
        $pluriel = $nbDocuments > 1 ? 's' : '';
        
        $message = (new MailMessage)
                    ->subject("📄 Rappel : Document{$pluriel} manquant{$pluriel}")
                    ->greeting("Bonjour {$this->candidatName},")
                    ->line("Nous vous rappelons que votre dossier nécessite encore **{$nbDocuments} document{$pluriel}** pour être complet.")
                    ->line("**Document{$pluriel} manquant{$pluriel} :**");

        foreach ($this->documentsManquants as $index => $doc) {
            $message->line(($index + 1) . ". {$doc}");
        }

        $message->line('**Pour compléter votre dossier :**')
                ->line('1. Connectez-vous à votre espace')
                ->line('2. Accédez à votre dossier')
                ->line('3. Téléchargez les documents manquants')
                ->line('⚠️ **Important :** Un dossier incomplet peut retarder votre formation.')
                ->action('Télécharger mes documents', url('/dossiers'))
                ->line('Si vous avez des questions sur les documents requis, contactez votre auto-école.')
                ->line('Merci de compléter votre dossier rapidement.');

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
            'type' => 'rappel_document_manquant',
            'dossier_id' => is_object($this->dossier) ? $this->dossier->id : $this->dossier['id'],
            'candidat_name' => $this->candidatName,
            'documents_manquants' => $this->documentsManquants,
            'nombre_documents' => count($this->documentsManquants),
            'message' => count($this->documentsManquants) > 1 
                ? count($this->documentsManquants) . " documents manquants dans votre dossier"
                : "1 document manquant dans votre dossier",
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
            $nb = count($this->documentsManquants);
            $pluriel = $nb > 1 ? 's' : '';
            $message = "DGTT: Votre dossier est incomplet. {$nb} document{$pluriel} manquant{$pluriel}. Veuillez les uploader rapidement.";
            $smsService->send($phoneNumber, $message);

            Log::info('[SMS] RappelDocumentManquant envoyé', ['phone' => $phoneNumber]);
        } catch (\Exception $e) {
            Log::error('[SMS] Erreur RappelDocumentManquant', ['error' => $e->getMessage()]);
        }
    }
}
