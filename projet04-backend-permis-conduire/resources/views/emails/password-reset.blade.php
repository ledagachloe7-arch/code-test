<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Réinitialisation de mot de passe</title>
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
            background-color: #2563eb;
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
        .button {
            display: inline-block;
            background-color: #2563eb;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
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
        <h1>🔐 Réinitialisation de mot de passe</h1>
        <p>Système Auto-École</p>
    </div>
    
    <div class="content">
        <h2>Bonjour,</h2>
        
        <p>Vous avez demandé la réinitialisation de votre mot de passe. Voici votre code de réinitialisation :</p>
        
        <div class="code-box">
            {{ $code }}
        </div>
        
        <p><strong>Instructions :</strong></p>
        <ol>
            <li>Copiez le code ci-dessus</li>
            <li>Cliquez sur le bouton ci-dessous pour accéder à la page de réinitialisation</li>
            <li>Saisissez votre email, le code et votre nouveau mot de passe</li>
        </ol>
        
        <div style="text-align: center;">
            <a href="{{ $resetUrl }}" class="button">Réinitialiser mon mot de passe</a>
        </div>
        
        <div class="warning">
            <strong>⚠️ Important :</strong>
            <ul>
                <li>Ce code expire dans <strong>{{ $expiresInMinutes }} minutes</strong></li>
                <li>Ne partagez jamais ce code avec personne</li>
                <li>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email</li>
            </ul>
        </div>
        
        <p>Si vous rencontrez des difficultés, contactez notre support technique.</p>
        
        <p>Cordialement,<br>
        L'équipe Auto-École</p>
    </div>
    
    <div class="footer">
        <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
        <p>© {{ date('Y') }} Système Auto-École. Tous droits réservés.</p>
    </div>
</body>
</html>
