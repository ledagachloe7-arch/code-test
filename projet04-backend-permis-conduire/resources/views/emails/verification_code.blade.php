<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vérification de votre compte</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #10b981;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background-color: #f8fafc;
            padding: 30px;
            border-radius: 0 0 8px 8px;
        }
        .code-box {
            background-color: #1e293b;
            color: #f1f5f9;
            padding: 20px;
            text-align: center;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 4px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .info {
            background-color: #dbeafe;
            border: 1px solid #3b82f6;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .warning {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 14px;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>✅ Vérification de votre compte</h1>
        <p>Système Auto-École</p>
    </div>
    
    <div class="content">
        <h2>Bonjour {{ $user->personne->prenom ?? 'Utilisateur' }},</h2>
        
        <p>Merci de vous être inscrit sur notre plateforme Auto-École. Pour activer votre compte, veuillez utiliser le code de vérification suivant :</p>
        
        <div class="code-box">
            {{ $code }}
        </div>
        
        <div class="info">
            <strong>📋 Instructions :</strong>
            <ol style="margin: 10px 0; padding-left: 20px;">
                <li>Copiez le code ci-dessus (8 chiffres)</li>
                <li>Retournez sur la plateforme</li>
                <li>Saisissez votre identifiant (email ou téléphone) et le code de vérification</li>
                <li>Votre compte sera activé et vous pourrez vous connecter</li>
            </ol>
        </div>
        
        <div class="warning">
            <strong>⚠️ Important :</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Ce code expire dans <strong>{{ $expiresInMinutes }} minutes</strong></li>
                <li>Ne partagez jamais ce code avec personne</li>
                <li>Si vous n'avez pas créé de compte, ignorez cet email</li>
            </ul>
        </div>
        
        <p><strong>Note :</strong> Si vous avez également fourni un numéro de téléphone, vous recevrez également ce code par SMS (si l'envoi SMS est activé).</p>
        
        <p>Si vous rencontrez des difficultés ou si vous n'avez pas demandé la création de ce compte, contactez notre support technique.</p>
        
        <p>Cordialement,<br>
        L'équipe Auto-École</p>
    </div>
    
    <div class="footer">
        <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
        <p>© {{ date('Y') }} Système Auto-École. Tous droits réservés.</p>
    </div>
</body>
</html>



