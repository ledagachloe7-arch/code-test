<?php

// Test LIVE (par dossier) : affecte un code_paiement réel à un dossier,
// puis appelle la nouvelle logique "1 dossier" (checkAndProcessPaymentForDossier).

use App\Models\Dossier;
use App\Services\PaiementService;
use Illuminate\Contracts\Console\Kernel;

require __DIR__ . '/vendor/autoload.php';

/** @var \Illuminate\Foundation\Application $app */
$app = require __DIR__ . '/bootstrap/app.php';

/** @var Kernel $kernel */
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

$codePaiement = 'PERTE67';

echo "=== Test paiement Airtel LIVE (1 dossier) ===\n";
echo "Code paiement: {$codePaiement}\n\n";

// 1) Préparer un dossier de test
$dossier = Dossier::where('code_paiement', $codePaiement)->first();
if (!$dossier) {
    $dossier = Dossier::with('candidat.personne')->first();
    if (!$dossier) {
        echo "Aucun dossier en base. Impossible de tester.\n";
        exit(1);
    }
    Dossier::withoutEvents(function () use ($dossier, $codePaiement) {
        $dossier->statut = 'EN_ATTENTE_PAIEMENT';
        $dossier->code_paiement = $codePaiement;
        $dossier->save();
    });
    $dossier->refresh();
} else {
    $dossier->update([
        'statut' => 'EN_ATTENTE_PAIEMENT',
    ]);
    $dossier->refresh();
}

echo "Dossier avant check:\n";
echo json_encode([
    'id' => $dossier->id,
    'numero' => $dossier->numero,
    'statut' => $dossier->statut,
    'code_paiement' => $dossier->code_paiement,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";

/** @var PaiementService $paiementService */
$paiementService = $app->make(PaiementService::class);

// 2) Appeler la logique ciblée 1 dossier
$result = $paiementService->checkAndProcessPaymentForDossier($dossier->load('candidat.personne'));

echo "Résultat checkAndProcessPaymentForDossier:\n";
echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";

// 3) Recharger et afficher
$dossier->refresh();
$paiements = $dossier->paiements()->orderBy('created_at', 'desc')->get()->toArray();

echo "Dossier après check:\n";
echo json_encode([
    'id' => $dossier->id,
    'numero' => $dossier->numero,
    'statut' => $dossier->statut,
    'code_paiement' => $dossier->code_paiement,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";

echo "Paiements liés à ce dossier:\n";
echo json_encode($paiements, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";

