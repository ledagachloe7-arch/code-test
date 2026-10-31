<?php

namespace App\Channels;

use Illuminate\Notifications\Notification;

/**
 * Canal personnalisé pour l'envoi de notifications SMS
 * 
 * Ce canal est utilisé automatiquement lorsque vous ajoutez 'sms' dans via()
 */
class SmsChannel
{
    /**
     * Envoyer la notification
     *
     * @param  mixed  $notifiable
     * @param  \Illuminate\Notifications\Notification  $notification
     * @return void
     */
    public function send($notifiable, Notification $notification)
    {
        // Appeler la méthode toSms() de la notification
        if (method_exists($notification, 'toSms')) {
            $notification->toSms($notifiable);
        }
    }
}
