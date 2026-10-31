<?php

namespace App\Notifications;

use App\Models\Dossier;
use App\Channels\SmsChannel;
use Illuminate\Bus\Queueable;
use App\Services\AirtelSmsService;
use Illuminate\Support\Facades\Log;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use App\Models\Utilisateur;

class PaiementToDo extends Notification implements ShouldQueue {

    use Queueable;

    protected $user;
    protected $dossier;

    /**
     * Create a new notification instance.
     */
    public function __construct(Utilisateur $user,Dossier $dossier)
    {
        $this->dossier = $dossier;
        $this->user = $user;
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
        $personne = $this->user->personne;
        $nomComplet = $personne ? "{$personne->prenom} {$personne->nom}" : $this->user->email;

        $message = (new MailMessage)
                    ->subject('🎉 Bienvenue sur la plateforme de gestion des permis de conduire')
                    ->greeting("Bonjour {$nomComplet},")
                    ->line('DGTT: Bonne nouvelle ! Votre dossier a été validé par notre opérateur!')
                    ->line('Vous êtes invité(e) à effectuer un paiement via Airtel Money ou Mobicash!')
                    ->line("**Votre code de paiement est le suivant : {$this->dossier->code_paiement} :**");

        return $message;
    }

    /**
     * Notification par SMS
     */
    public function toSms(object $notifiable): void
    {
        //dd('test');
        try {
            $phoneNumber = $notifiable->telephone ?? $notifiable->personne?->contact ?? null;
            if (!$phoneNumber) return;

            $smsService = new AirtelSmsService();
            $message = "DGTT: Bonne nouvelle ! Votre dossier a été validé , vous pouvez désormais effectuer le paiement muni du code
             {$this->dossier->code_paiement}.";
            $smsService->send($phoneNumber, $message);

            Log::info('[SMS] Paiement à effectuer envoyé', ['phone' => $phoneNumber]);
        } catch (\Exception $e) {
            Log::error('[SMS] Erreur Paiement à effectuer', ['error' => $e->getMessage()]);
        }
    }
}
