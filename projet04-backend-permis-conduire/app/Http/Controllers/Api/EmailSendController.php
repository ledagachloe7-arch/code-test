<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\CreateAccountEmailService;
use App\Mail\ExamenEmailService;
use App\Mail\PermisEmailService;
use App\Mail\ResetPasswordEmailService;
use App\Mail\ResultatBiometrieEmailService;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

#[Group('Emails', description: 'Envoi d\'emails (création compte, examen, permis, réinitialisation mot de passe). Endpoints d\'envoi déclenchés par l\'app.')]
class EmailSendController extends Controller
{
    /** Envoie un email de bienvenue après création de compte. Body : email, username. */
    public function sendEmailCreationAccount(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'username' => 'required|string',
        ]);
        $data = [
            'name' => $request['username'],
            'email' => $request['email'],
            'titre' => 'Inscription Auto Ecole',
            'message' => 'Votre compte a été créé avec succès. Vous pouvez dès maintenant accéder à votre espace personnel pour gérer votre dossier de permis de conduire.'
        ];


        Mail::to($data['email'])->queue(new CreateAccountEmailService($data));
        return response()->json(['message' => 'Email envoyé avec succès']);
    }

    public function resetPassword(Request $request)
    {

        $data = [
            'name' => $request['username'],
            'email' => $request['email'],
            'titre' => 'Réinitialiser mot de passe',
            'message' => 'Veuillez cliquer sur le lien ci-dessous pour réinitialiser votre mot de passe :',
            'reset_link' => $request['reset_link']
        ];

        Mail::to($data['email'])->queue(new ResetPasswordEmailService($data));
        return response()->json(['message' => 'Email envoyé avec succès']);
    }


    public function passwordModifier(Request $request)
    {

        $data = [
            'name' => $request['username'],
            'email' => $request['email'],
            'titre' => 'Mot de passe modifié',
            'message' => 'Votre mot de passe a été modifié avec succès. Si vous n\'êtes pas à l\'origine de ce changement, veuillez contacter le support immédiatement.'

        ];

        Mail::to($data['email'])->queue(new ResetPasswordEmailService($data));
        return response()->json(['message' => 'Email envoyé avec succès']);
    }

    public function resultatBiometrie(Request $request)
    {

        $data = [
            'name' => $request['username'],
            'email' => $request['email'],
            'titre' => 'Résultat et Biométrie',
            'message' => $request['resultat']
        ];
      //  dd($data);

        Mail::to($data['email'])->queue(new ResultatBiometrieEmailService($data));
        return response()->json(['message' => 'Email envoyé avec succès']);
    }


    public function permisDisponible(Request $request)
    {

        $data = [
            'name' => $request['username'],
            'email' => $request['email'],
            'titre' => 'Permis Disponible',
            'message' => $request['resultat']
        ];
        Mail::to($data['email'])->queue(new PermisEmailService($data));
        return response()->json(['message' => 'Email envoyé avec succès']);
    }


    public function examenPermis(Request $request)
    {

        $data = [
            'name' => $request['username'],
            'email' => $request['email'],
            'titre' => 'Examen De Permis',
            'message' => $request['message']
        ];

        Mail::to($data['email'])->queue(new ExamenEmailService($data));
        return response()->json(['message' => 'Email envoyé avec succès']);
    }


}
