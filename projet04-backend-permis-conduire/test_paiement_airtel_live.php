<?php

// Script de test LIVE : utiliser le vrai endpoint Paynala/Airtel
// avec un code de paiement fourni (ex: PATVS283) et vérifier
// que PaiementService::dossierPendingPayments() met bien à jour
// la table paiements et le dossier.

use App\Models\Dossier;
use App\Services\PaiementService;
use Illuminate\Contracts\Console\Kernel;

require __DIR__ . '/vendor/autoload.php';

/** @var \Illuminate\Foundation\Application $app */
$app = require __DIR__ . '/bootstrap/app.php';

/** @var Kernel $kernel */
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

$codePaiement = 'PATVS283';

echo "=== Test paiement Airtel LIVE (code_paiement = {$codePaiement}) ===\n\n";

// 1. Récupérer ou préparer un dossier de test
$dossier = Dossier::where('code_paiement', $codePaiement)
    ->where('statut', 'EN_ATTENTE_PAIEMENT')
    ->first();

if (!$dossier) {
    echo "Aucun dossier EN_ATTENTE_PAIEMENT avec code_paiement={$codePaiement} trouvé. Mise à jour d'un dossier existant pour le test...\n";
    $any = Dossier::with('candidat.personne')->first();
    if (!$any) {
        echo "Aucun dossier en base. Impossible de tester.\n";
        exit(1);
    }
    Dossier::withoutEvents(function () use ($any, $codePaiement) {
        $any->statut = 'EN_ATTENTE_PAIEMENT';
        $any->code_paiement = $codePaiement;
        $any->save();
    });
    $dossier = $any->fresh();
}

echo "Dossier testé:\n";
echo json_encode([
    'id' => $dossier->id,
    'numero' => $dossier->numero,
    'statut' => $dossier->statut,
    'code_paiement' => $dossier->code_paiement,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";

/** @var PaiementService $paiementService */
$paiementService = $app->make(PaiementService::class);

echo "Appel de PaiementService::dossierPendingPayments()...\n\n";
$paiementService->dossierPendingPayments();

// 2. Recharger le dossier et afficher son état
$dossier->refresh();

echo "Dossier après dossierPendingPayments():\n";
echo json_encode([
    'id' => $dossier->id,
    'numero' => $dossier->numero,
    'statut' => $dossier->statut,
    'code_paiement' => $dossier->code_paiement,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";

// 3. Afficher les paiements liés à ce dossier
$paiements = $dossier->paiements()->orderBy('created_at', 'desc')->get()->toArray();

echo "Paiements liés à ce dossier:\n";
echo json_encode($paiements, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";

