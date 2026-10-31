<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\Utilisateur;
use App\Services\AirtelSmsService;
use Illuminate\Support\Facades\Log;

use App\Channels\SmsChannel;

class AccountCreatedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $user;
    protected $password;

    /**
     * Create a new notification instance.
     */
    public function __construct(Utilisateur $user, string $password = null)
    {
        $this->user = $user;
        $this->password = $password;
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
        $personne = $this->user->personne;
        $nomComplet = $personne ? "{$personne->prenom} {$personne->nom}" : $this->user->email;

        $message = (new MailMessage)
                    ->subject('🎉 Bienvenue sur la plateforme de gestion des permis de conduire')
                    ->greeting("Bonjour {$nomComplet},")
                    ->line('Votre compte a été créé avec succès !')
                    ->line('**Informations de connexion :**')
                    ->line('📧 Email : ' . $this->user->email)
                    ->line('👤 Rôle : ' . ucfirst(str_replace('_', ' ', $this->user->role)));

        if ($this->password) {
            $message->line('🔑 Mot de passe : ' . $this->password)
                    ->line('⚠️ **Important :** Veuillez changer ce mot de passe après votre première connexion pour sécuriser votre compte.');
        }

        $message->line('**Prochaines étapes :**')
                ->line('1. Connectez-vous avec vos identifiants')
                ->line('2. Complétez votre profil')
                ->line('3. Commencez à utiliser la plateforme');

        if ($this->user->role === 'candidat') {
            $message->line('4. Choisissez une auto-école et une formation')
                    ->line('5. Téléchargez les documents requis');
        } elseif ($this->user->role === 'responsable_auto_ecole') {
            $message->line('4. Gérez vos candidats')
                    ->line('5. Suivez les dossiers en cours');
        }

        $message->action('Se connecter maintenant', url('/login'))
                ->line('Si vous rencontrez des difficultés, n\'hésitez pas à nous contacter.')
                ->line('Merci de faire confiance à notre plateforme !');

        return $message;
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $personne = $this->user->personne;
        $nomComplet = $personne ? "{$personne->prenom} {$personne->nom}" : $this->user->email;

        return [
            'type' => 'account_created',
            'user_id' => $this->user->id,
            'email' => $this->user->email,
            'role' => $this->user->role,
            'nom_complet' => $nomComplet,
            'created_at' => $this->user->created_at->toISOString(),
            'message' => 'Votre compte a été créé avec succès ! Bienvenue ' . $nomComplet,
        ];
    }

    /**
     * Notification par SMS
     *
     * @param  mixed  $notifiable
     * @return void
     */
    public function toSms(object $notifiable): void
    {
        try {
            // Récupérer le numéro de téléphone
            $phoneNumber = $notifiable->telephone 
                ?? $notifiable->personne?->contact 
                ?? null;

            if (!$phoneNumber) {
                Log::warning('[SMS] AccountCreated - Pas de numéro', [
                    'user_id' => $notifiable->id
                ]);
                return;
            }

            // Créer le service SMS
            $smsService = new AirtelSmsService();

            // Nom du candidat
            $personne = $this->user->personne;
            $prenom = $personne ? $personne->prenom : 'Cher candidat';

            // Message SMS court (max 160 caractères)
            $message = "Bienvenue {$prenom} ! Votre compte DGTT a été créé avec succès. Connectez-vous sur dgtt.ga - DGTT";

            // Envoyer le SMS
            $sent = $smsService->send($phoneNumber, $message);

            if ($sent) {
                Log::info('[SMS] AccountCreated envoyé', [
                    'user_id' => $notifiable->id,
                    'phone' => $phoneNumber
                ]);
            }

        } catch (\Exception $e) {
            Log::error('[SMS] Erreur AccountCreated', [
                'error' => $e->getMessage(),
                'user_id' => $notifiable->id
            ]);
        }
    }
}

