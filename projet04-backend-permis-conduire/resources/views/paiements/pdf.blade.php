<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Ticket Paiement</title>

    <style>
        body {
            font-family: monospace;
            font-size: 11px;
            width: 220px;
            margin: 0;
            padding: 5px;
            color: #000;
        }

        .center {
            text-align: center;
        }

        .bold {
            font-weight: bold;
        }

        .line {
            border-top: 1px dashed #000;
            margin: 6px 0;
        }

        .row {
            display: flex;
            justify-content: space-between;
        }

        .mt-5 { margin-top: 5px; }
        .mt-10 { margin-top: 10px; }

        .big {
            font-size: 16px;
            font-weight: bold;
        }
    </style>
</head>

<body>

    <!-- HEADER -->
    <div class="center bold">
        REÇU DE PAIEMENT
    </div>

    <div class="line"></div>

    <!-- CLIENT -->
    <div class="row">
        <span>Payeur:</span>
        <span> {{ $paiement->nom }} {{ $paiement->prenom }}</span>
    </div>

    <div class="line"></div>

    <!-- INFOS -->
    <div class="row">
        <span>Date</span>
        <span>{{ $paiement->created_at->format('d/m/Y') }}</span>
    </div>

    <div class="row">
        <span>Heure</span>
        <span>{{ $paiement->created_at->format('H:i') }}</span>
    </div>

    <div class="row">
        <span>Code</span>
        <span>{{ $paiement->code_paiement }}</span>
    </div>

    <div class="row">
        <span>Réference</span>
        <span>{{ $paiement->reference_paiement }}</span>
    </div>

    <div class="line"></div>

    <!-- MONTANT -->
    <div class="center big">
        {{ number_format($paiement->montant, 0, ',', ' ') }} XAF
    </div>

    <div class="line"></div>

    <!-- DOSSIER -->
     <div class="row">
        <span>Numéro:</span>
        <span>{{ $paiement->dossier->numero }}</span>
    </div>

    <div class="row">
        <span>Statut:</span>
        <span>{{ $paiement->dossier->statut }}</span>
    </div>

    @if($paiement->dossier->commentaires)
        <div class="mt-5">
            <span>Commentaire:</span>
            {{ $paiement->dossier->commentaires }}
        </div>
    @endif

    <div class="line"></div>

    <!-- FOOTER -->
    <div class="center mt-10">
        Merci pour votre paiement
    </div>

</body>
</html>
