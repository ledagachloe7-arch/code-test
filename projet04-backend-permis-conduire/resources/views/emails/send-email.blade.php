<!DOCTYPE html>
<html lang="fr">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mise à jour importante</title>
    <style>
        /* Reset et styles de base */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Roboto, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8f9fa;
            padding: 20px;
        }

        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }

        /* En-tête */
        .header {
            background: linear-gradient(135deg, #4285f4, #34a853);
            color: white;
            padding: 30px 40px;
            text-align: center;
        }

        .logo {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
        }

        .developer-badge {
            background: rgba(255, 255, 255, 0.2);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
            display: inline-block;
            margin-bottom: 15px;
        }

        /* Contenu principal */
        .content {
            padding: 40px;
        }

        .greeting {
            font-size: 18px;
            margin-bottom: 25px;
            color: #5f6368;
        }

        .section {
            margin-bottom: 30px;
        }

        .section-title {
            font-size: 20px;
            font-weight: 600;
            color: #1a73e8;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e8f0fe;
        }

        .policy-announcement {
            background: #f8f9fa;
            border-left: 4px solid #4285f4;
            padding: 20px;
            margin: 25px 0;
            border-radius: 0 8px 8px 0;
        }

        .date-highlight {
            color: #ea4335;
            font-weight: 600;
            font-size: 18px;
        }

        /* Points clés */
        .key-points {
            display: grid;
            gap: 15px;
            margin: 25px 0;
        }

        .point {
            display: flex;
            align-items: flex-start;
            gap: 12px;
        }

        .point-icon {
            color: #34a853;
            font-size: 18px;
            margin-top: 2px;
        }

        /* Ressources */
        .resources {
            background: #e8f0fe;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
        }

        .resource-links {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            margin-top: 15px;
        }

        .resource-link {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #1a73e8;
            text-decoration: none;
            font-weight: 500;
            padding: 8px 16px;
            background: white;
            border-radius: 6px;
            border: 1px solid #dadce0;
            transition: all 0.3s ease;
        }

        .resource-link:hover {
            background: #1a73e8;
            color: white;
            transform: translateY(-2px);
        }

        /* Pied de page */
        .footer {
            background: #f8f9fa;
            padding: 30px 40px;
            text-align: center;
            border-top: 1px solid #dadce0;
        }

        .team-signature {
            font-size: 16px;
            font-weight: 600;
            color: #5f6368;
            margin-bottom: 20px;
        }

        .social-links {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin: 25px 0;
        }

        .social-icon {
            width: 40px;
            height: 40px;
            background: #5f6368;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            text-decoration: none;
            transition: all 0.3s ease;
        }

        .social-icon:hover {
            transform: scale(1.1);
            background: #1a73e8;
        }

        .legal {
            font-size: 12px;
            color: #5f6368;
            line-height: 1.4;
        }

        .legal-links {
            margin-top: 15px;
        }

        .legal-links a {
            color: #5f6368;
            text-decoration: none;
            margin: 0 10px;
        }

        .legal-links a:hover {
            color: #1a73e8;
        }

        /* Responsive */
        @media (max-width: 600px) {

            .content,
            .header,
            .footer {
                padding: 25px;
            }

            .resource-links {
                flex-direction: column;
            }

            .social-links {
                flex-wrap: wrap;
            }
        }

        .row {
            display: flex;
            align-items: center;
            /* aligne verticalement */
            justify-content: center;
            /* centre horizontalement */
            gap: 20px;
            /* espace entre les images */
        }

        .logo,
        .logo-left {
            max-width: 64px !important;
            height: 64px !important;
        }
    </style>
</head>

<body>
    <div class="email-container">
        <div class="row">
            <img class="logo"
                src="{{ $message->embed(public_path('images/WhatsApp Image 2025-11-21 à 14.23.22_10d7437e.jpg')) }}"
                alt="Logo de l'entreprise" style="display: block; margin: 20px auto; max-width: 150px;">
            <img src="{{ $message->embed(public_path('images/Drapeau_du_Gabon.png')) }}" alt="Drapeau du Gabon"
                class="logo-left" style="display: block; margin: 20px auto; max-width: 150px;">


        </div>
        <!-- En-tête -->
        <div class="header">

            <div class="developer-badge">{{ $data['titre'] }}</div>

        </div>

        <!-- Contenu principal -->
        <div class="content">
            <div class="greeting">
                Bonjour @if(isset($data['name']) && !empty(trim($data['name']))){{ $data['name'] }}
                @endif
                ,
            </div>

            <div class="section">
                <p> {{ $data['message'] }} </p>
            </div>
            @if(isset($data['code']) && !empty(trim($data['code'])))
                <div class="reset-link-container">
                    <a href="#" class="reset-link">
                        {{ $data['code'] }}
                    </a>
                </div>
                <div >
                    @if(isset($data['time']) && !empty(trim($data['time'])))
                    <p>Votre code de récupération de mot de passe est valable pour une durée limitée de  {{ $data['time'] }} </p>
                     @endif
                </div>
            @endif
        </div>

        <!-- Pied de page -->
        <div class="footer">
            <div class="team-signature">L'équipe Auto Ecole</div>


            <div class="legal">
                <p>© 2025 DGTT. Tous droits réservés.</p>
                <!-- <div class="legal-links">
                    <a href="#">[Adresse de votre entreprise]</a> |
                    <a href="#">Se désabonner</a> |
                    <a href="#">Politique de confidentialité</a>
                </div> -->
            </div>
        </div>
    </div>
</body>

</html>